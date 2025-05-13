const jwt = require('jsonwebtoken');

/**
 * Create JWT token
 * @param {Object} user - User object with uid, email, and admin properties
 * @returns {String} JWT token
 */
const createToken = (user) => {
  return jwt.sign(
    { 
      uid: user.uid,
      email: user.email,
      admin: user.admin || false
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Generate refresh token
 * @param {Object} user - User object with uid, email, and admin properties
 * @returns {String} JWT refresh token
 */
const refreshToken = (user) => {
  return jwt.sign(
    { 
      uid: user.uid,
      email: user.email,
      admin: user.admin || false
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

module.exports = { createToken, verifyToken, refreshToken };