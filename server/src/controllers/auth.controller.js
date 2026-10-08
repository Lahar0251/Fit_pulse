import {
  registerMember,
  loginUser,
  validatePassword,
  validateEmail,
  findUserById,
} from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, confirmPassword, age, height, weight, fitnessGoal, experienceLevel, plannedDaysPerWeek, preferredSchedule, wantsTrainer, trainerRequested } = req.body;

    // Validate required fields
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Full Name is required',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required',
      });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({
        status: 'error',
        message: emailError,
      });
    }

    if (!phone || !phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number must be exactly 10 digits (numbers only)',
      });
    }

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required',
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please confirm your password',
      });
    }

    // Confirm password match check
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match',
      });
    }

    // Password strength check
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        status: 'error',
        message: passwordError,
      });
    }

    // Note: If request body maliciously passed `role: 'admin'`, it is explicitly ignored here
    const { user, token } = await registerMember({
      fullName,
      email,
      phone,
      password,
      age,
      height,
      weight,
      fitnessGoal,
      experienceLevel,
      plannedDaysPerWeek,
      preferredSchedule,
      wantsTrainer,
      trainerRequested,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Account successfully registered as member',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Both email and password are required',
      });
    }

    const { user, token } = await loginUser({ email, password });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
