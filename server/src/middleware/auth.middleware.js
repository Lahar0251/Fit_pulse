import jwt from 'jsonwebtoken';
import FitnessProfile from '../models/fitnessProfile.model.js';
import { getDBStatus } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fitpulse_super_secret_jwt_key_2026';

export const protect = (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'You are not logged in. Please log in to gain access.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to access this resource.',
      });
    }
    next();
  };
};

export const requireActiveMembership = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'member') {
      return next(); // Skip for admin/trainer, or let restrictTo handle role logic
    }

    if (getDBStatus().isConnected) {
      const profile = await FitnessProfile.findOne({ userId: req.user.id });
      if (!profile) {
        return res.status(403).json({
          status: 'error',
          message: 'Access Denied: You need an active membership to use this feature.',
        });
      }

      const now = new Date();
      if (profile.membershipExpiry && new Date(profile.membershipExpiry) <= now) {
        if (profile.membershipStatus === 'Active') {
          profile.membershipStatus = 'Expired';
          await profile.save();
        }
        return res.status(403).json({
          status: 'error',
          message: 'Access Denied: Your membership has expired. Please renew your membership to continue.',
        });
      }

      if (profile.membershipStatus !== 'Active') {
        return res.status(403).json({
          status: 'error',
          message: 'Access Denied: You need an active membership to use this feature.',
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify membership status.',
    });
  }
};
