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
      auth.onAuthStateChanged((user) => {
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.error("Auth check error:", error);
      reject(error);
    }
  });
}

// Login function with redirect to admin.html
export async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();
    localStorage.setItem('adminToken', token);
    
    // Redirect to admin page immediately after successful login
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
    await auth.signOut();
    localStorage.removeItem('adminToken');
    window.location.href = '/login.html';
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Refresh token function
export async function refreshToken() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    const newToken = await user.getIdToken(true);
    localStorage.setItem('adminToken', newToken);
    return newToken;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// Initialize Firebase when this module is imported
initializeFirebase();