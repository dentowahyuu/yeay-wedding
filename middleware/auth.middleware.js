const admin = require('firebase-admin');

/**
 * Middleware to verify user authentication via Firebase token
 */
exports.verifyAuth = async (req, res, next) => {
  try {
    // Get the custom auth header
    const customAuthHeader = req.headers['x-firebase-auth'];
    
    if (!customAuthHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak: Token tidak ditemukan' 
      });
    }
    
    try {
      // Decode the custom auth header
      let authData;
      try {
        // Use browser-compatible base64 decoding
        const decodedString = Buffer.from(customAuthHeader, 'base64').toString('utf-8');
        authData = JSON.parse(decodedString);
      } catch (e) {
        console.error('Failed to parse auth header:', e);
        return res.status(401).json({ 
          success: false, 
          message: 'Akses ditolak: Format header tidak valid' 
        });
      }
      
      const { token, email, uid } = authData;
      
      if (!token || !email || !uid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Akses ditolak: Data autentikasi tidak lengkap' 
        });
      }
      
      try {
        // Verify the Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Check if the token belongs to the same user
        if (decodedToken.uid !== uid || decodedToken.email !== email) {
          return res.status(403).json({ 
            success: false, 
            message: 'Akses ditolak: Token tidak valid' 
          });
        }
        
        // Set user info in request object
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: 'admin' // Assume all Firebase users are admins for simplicity
        };
        
        next();
      } catch (verifyError) {
        console.error('Token verification error:', verifyError);
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak: Token tidak valid atau kadaluwarsa' 
        });
      }
    } catch (error) {
      console.error('Auth header processing error:', error);
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak: Token tidak valid atau kadaluwarsa' 
      });
    }
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
    
    // Since we're assuming all Firebase users are admins, we can just pass through
    // In a real app, you might want to check a custom claim or a database record
    next();
    
  } catch (error) {
    console.error('Error dalam requireAdmin middleware:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error server: ' + error.message 
    });
  }
};