const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.assignUserMiddleware = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    if (token) {

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

      } catch (error) {
        next();
      }
    }
  }

  next();

}
