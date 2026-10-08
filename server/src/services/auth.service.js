import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import { getDBStatus } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fitpulse_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory user store fallback used if MongoDB server is offline
const inMemoryUsers = new Map();

// Helper to seed default test accounts
const seedDefaultAccounts = async () => {
  const seeds = [
    {
      fullName: 'System Admin',
      email: 'admin@fitpulse.com',
      phone: '1234567890',
      passwordPlain: 'Admin@12345!',
      role: 'admin',
    },
    {
      fullName: 'Alex Trainer',
      email: 'trainer@fitpulse.com',
      phone: '9876543210',
      passwordPlain: 'Trainer@12345!',
      role: 'trainer',
    },
    {
      fullName: 'John Member',
      email: 'member@fitpulse.com',
      phone: '5551234567',
      passwordPlain: 'Member@12345!',
      role: 'member',
    },
  ];

  for (const seed of seeds) {
    const hashedPassword = await bcrypt.hash(seed.passwordPlain, 10);
    const normalizedEmail = seed.email.toLowerCase();

    // Seed in-memory
    if (!inMemoryUsers.has(normalizedEmail)) {
      inMemoryUsers.set(normalizedEmail, {
        _id: new mongoose.Types.ObjectId().toString(),
        fullName: seed.fullName,
        email: normalizedEmail,
        phone: seed.phone,
        password: hashedPassword,
        role: seed.role,
        hasLoggedInBefore: true,
        createdAt: new Date(),
      });
    }

    // Seed MongoDB if connected
    if (getDBStatus().isConnected) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (!existing) {
          await User.create({
            fullName: seed.fullName,
            email: normalizedEmail,
            phone: seed.phone,
            password: hashedPassword,
            role: seed.role,
            hasLoggedInBefore: true,
          });
        }
      } catch (err) {
        console.warn(`[Seed Warning] Could not seed ${normalizedEmail} to Mongo: ${err.message}`);
      }
    }
  }
};

// Seed initial test accounts on module initialization
seedDefaultAccounts();

/**
 * Validate password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9)';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*...)';
  }
  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return 'Email address is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please provide a valid email address';
  }
  return null;
};

/**
 * Generate JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Register a new member through public registration.
 * CRITICAL SECURITY:
 * Force role = 'member' on the backend regardless of payload input.
 */
export const registerMember = async ({ fullName, email, phone, password, age, height, weight, fitnessGoal, experienceLevel, plannedDaysPerWeek, preferredSchedule, wantsTrainer, trainerRequested }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  // Check duplicate email in Mongo or in-memory
  let existingUser = null;
  if (getDBStatus().isConnected) {
    existingUser = await User.findOne({ email: normalizedEmail });
  } else {
    existingUser = inMemoryUsers.get(normalizedEmail);
  }

  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // STRICT ROLE ENFORCEMENT: Public registration ALWAYS receives role = 'member'
  const userPayload = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: (phone || '').trim(),
    password: hashedPassword,
    role: 'member', // Hardcoded and non-negotiable
    hasLoggedInBefore: false, // Newly registered account has never logged in before
  };

  let savedUser = null;

  const isTrainerWanted = trainerRequested !== undefined ? Boolean(trainerRequested) : Boolean(wantsTrainer);

  if (getDBStatus().isConnected) {
    const newUser = await User.create(userPayload);
    savedUser = newUser.toObject();

    const startLevel = (experienceLevel || 'beginner').toLowerCase();
    await FitnessProfile.create({
      userId: savedUser._id,
      age: age,
      height: height,
      weight: weight,
      fitnessGoal: fitnessGoal || 'muscle_gain',
      experienceLevel: startLevel,
      initialLevel: startLevel,
      currentLevel: startLevel,
      levelSince: new Date(),
      promotionHistory: [],
      monthlyHistory: [],
      plannedDaysPerWeek: plannedDaysPerWeek || 5,
      preferredSchedule: preferredSchedule || 'morning',
      trainerRequested: isTrainerWanted,
      wantsTrainer: isTrainerWanted,
    });
  } else {
    savedUser = {
      _id: 'mem_' + Date.now(),
      ...userPayload,
      createdAt: new Date(),
    };
    inMemoryUsers.set(normalizedEmail, { ...savedUser });
  }

  // Remove password hash from response copy
  const userResponse = { ...savedUser };
  delete userResponse.password;
  userResponse.hasLoggedInBefore = false;
  userResponse.isFirstLogin = true;

  const token = generateToken(userResponse);
  return { user: userResponse, token };
};

/**
 * Login user with credentials
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  let user = null;
  if (getDBStatus().isConnected) {
    user = await User.findOne({ email: normalizedEmail });
    if (user) user = user.toObject();
  }
  
  // Fallback to in-memory store if not found in Mongo or Mongo is disconnected
  if (!user) {
    user = inMemoryUsers.get(normalizedEmail);
  }

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check persistent status before this login
  const hadLoggedInBefore = Boolean(user.hasLoggedInBefore);

  // If this was the first login, record completion in persistent database
  if (!hadLoggedInBefore) {
    if (getDBStatus().isConnected) {
      await User.updateOne({ _id: user._id }, { hasLoggedInBefore: true });
    }
    if (inMemoryUsers.has(normalizedEmail)) {
      const memUser = inMemoryUsers.get(normalizedEmail);
      memUser.hasLoggedInBefore = true;
    }
  }

  const userResponse = { ...user };
  delete userResponse.password;
  // Return the first-login state for this session:
  // hadLoggedInBefore = false -> First Login ("Welcome to FitPulse, [Name]!")
  // hadLoggedInBefore = true -> Subsequent Login ("Welcome back, [Name]!")
  userResponse.hasLoggedInBefore = hadLoggedInBefore;
  userResponse.isFirstLogin = !hadLoggedInBefore;

  const token = generateToken(userResponse);
  return { user: userResponse, token };
};

/**
 * Find user by ID
 */
export const findUserById = async (id) => {
  if (getDBStatus().isConnected) {
    const user = await User.findById(id).select('-password');
    if (user) return user.toObject();
  }

  for (const user of inMemoryUsers.values()) {
    if (user._id === id || user.id === id) {
      const copy = { ...user };
      delete copy.password;
      return copy;
    }
  }
  return null;
};
