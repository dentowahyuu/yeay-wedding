const jwt = require('jsonwebtoken');

/**
 * Middleware to verify user authentication via JWT
 */
exports.verifyAuth = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak: Token tidak ditemukan' 
      });
    }
    
    // Verify the token
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak: Token tidak valid atau kadaluwarsa' 
        });
      }
      
      // Set user info in request object
      req.user = decoded;
      next();
    });
    
  } catch (error) {
    console.error('Error dalam verifyAuth middleware:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error server: ' + error.message 
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
exports.requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak: Autentikasi diperlukan' 
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak: Hak akses admin diperlukan' 
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Error dalam requireAdmin middleware:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error server: ' + error.message 
    });
  }
};