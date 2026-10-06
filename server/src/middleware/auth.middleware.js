import jwt from 'jsonwebtoken';

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

export const requireTrainer = (req, res, next) => {
  if (!req.user || (req.user.role !== 'trainer' && req.user.role !== 'admin')) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: Trainer privileges required.',
    });
  }
  next();
};

