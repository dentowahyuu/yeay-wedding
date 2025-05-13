const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

/**
 * Login controller - authenticates admin users
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan password diperlukan' 
      });
    }
    
    // Verify admin credentials from Firestore
    const db = admin.firestore();
    const adminUsersRef = await db.collection('adminUsers').where('email', '==', email).get();
    
    if (adminUsersRef.empty) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }
    
    const adminUser = adminUsersRef.docs[0].data();
    
    // Compare the password (in a real app, you would use bcrypt)
    // WARNING: This is for demonstration only. In production, use proper password hashing!
    if (adminUser.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }
    
    // Generate JWT tokens
    const accessToken = generateAccessToken(adminUser);
    const refreshToken = generateRefreshToken(adminUser);
    
    // Set secure HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.status(200).json({
      success: true,
      user: {
        id: adminUsersRef.docs[0].id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    });
    
  } catch (error) {
    console.error('Error dalam login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal login: ' + error.message 
    });
  }
};

/**
 * Refreshes access token using refresh token
 */
exports.refreshUserToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token tidak ditemukan' 
      });
    }
    
    // Verify the refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Token tidak valid' 
        });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      // Set new access token cookie
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Token berhasil diperbarui' 
      });
    });
    
  } catch (error) {
    console.error('Error dalam refreshUserToken:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal memperbarui token: ' + error.message 
    });
  }
};

/**
 * Logout - clears auth cookies
 */
exports.logout = (req, res) => {
  try {
    // Clear auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Berhasil logout' 
    });
    
  } catch (error) {
    console.error('Error dalam logout:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal logout: ' + error.message 
    });
  }
};

/**
 * Helper function to generate access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Helper function to generate refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}