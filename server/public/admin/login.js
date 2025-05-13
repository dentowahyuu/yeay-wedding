// Firebase configuration and initialization
// Import Firebase from CDN (browser compatible)
// Note: These imports will work assuming you've included the Firebase scripts in your HTML

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyAFPdpL4cY9WqMrJpHX6L3cATjOhl1r-W8",
  authDomain: "undangan-nikah-77b33.firebaseapp.com"
};

let app;
let auth;

// Initialize Firebase
export function initializeFirebase() {
  try {
    // Use Firebase from the global scope (loaded via script tag)
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    return true;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return false;
  }
}

// Check authentication status
export async function checkAuthStatus() {
  return new Promise((resolve, reject) => {
    try {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // Unsubscribe immediately to prevent multiple callbacks
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, (error) => {
        console.error("Auth state change error:", error);
        reject(error);
      });
    } catch (error) {
      console.error("Auth check error:", error);
      reject(error);
    }
  });
}

// Login function with Firebase authentication only
export async function login(email, password) {
  try {
    // Authenticate with Firebase
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const firebaseToken = await user.getIdToken();
    
    // Store Firebase token
    localStorage.setItem('firebaseToken', firebaseToken);
    
    // Set up a custom header for API requests
    // Use window.btoa for browser environment
    const customAuthHeader = window.btoa(JSON.stringify({
      email: user.email,
      uid: user.uid,
      token: firebaseToken
    }));
    
    localStorage.setItem('customAuthHeader', customAuthHeader);
    
    // Redirect to admin page
    window.location.href = '/admin.html';
    return { success: true, user };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
}

// Logout function
export async function logout() {
  try {
    // Sign out from Firebase
    await auth.signOut();
    localStorage.removeItem('firebaseToken');
    localStorage.removeItem('customAuthHeader');
    window.location.href = '/login.html';
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Refresh token function
export async function refreshToken() {
  try {
    // Check if user is logged in with Firebase
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    try {
      // Get fresh Firebase token
      const firebaseToken = await user.getIdToken(true);
      localStorage.setItem('firebaseToken', firebaseToken);
      
      // Update custom auth header
      const customAuthHeader = window.btoa(JSON.stringify({
        email: user.email,
        uid: user.uid,
        token: firebaseToken
      }));
      
      localStorage.setItem('customAuthHeader', customAuthHeader);
      
      return firebaseToken;
    } catch (tokenError) {
      // If token refresh fails due to network issues, try to use the existing token
      console.warn('Token refresh failed, using existing token:', tokenError);
      const existingToken = localStorage.getItem('firebaseToken');
      if (existingToken) {
        return existingToken;
      }
      throw tokenError;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// Initialize Firebase when this module is imported
initializeFirebase();

// Add event listener for the login form
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, looking for login form');
  
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    console.log('Login form found, adding event listener');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const result = await login(email, password);
      
      if (!result.success) {
        alert('Login failed: ' + result.error);
      }
    });
  } else {
    console.log('Login form not found. Current path:', window.location.pathname);
    
    // Check if we're on the login page
    if (window.location.pathname.includes('login.html')) {
      console.error('On login page but form not found. DOM structure:', document.body.innerHTML);
    } else {
      // We're on another page, check authentication
      checkAuthStatus().then(isLoggedIn => {
        if (isLoggedIn) {
          console.log('User is logged in');
          // If already logged in and on admin page, no need to redirect
          if (window.location.pathname.includes('admin.html')) {
            console.log('Already on admin page');
          } else {
            console.log('Redirecting to admin page');
            window.location.href = '/admin.html';
          }
        } else if (!window.location.pathname.includes('login.html')) {
          console.log('User not logged in, redirecting to login page');
          window.location.href = '/login.html';
        }
      }).catch(err => {
        console.error('Auth check failed:', err);
      });
    }
  }
});