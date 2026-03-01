import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth, db,
  googleProvider, microsoftProvider, appleProvider, twitterProvider, githubProvider,
} from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await ensureUserProfile(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function ensureUserProfile(firebaseUser) {
    const ref = doc(db, 'users', firebaseUser.uid, 'profile', 'info');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        currency: 'USD',
        createdAt: serverTimestamp(),
      });
    }
  }

  function clearError() { setError(null); }

  async function signInWithProvider(provider) {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    }
  }

  async function signInWithGoogle()    { return signInWithProvider(googleProvider);    }
  async function signInWithMicrosoft() { return signInWithProvider(microsoftProvider); }
  async function signInWithApple()     { return signInWithProvider(appleProvider);     }
  async function signInWithTwitter()   { return signInWithProvider(twitterProvider);   }
  async function signInWithGitHub()    { return signInWithProvider(githubProvider);    }

  async function signUpWithEmail(name, email, password) {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await ensureUserProfile({ ...cred.user, displayName: name });
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    }
  }

  async function signInWithEmail(email, password) {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    }
  }

  async function resetPassword(email) {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    }
  }

  async function logout() {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, error, clearError,
      signInWithGoogle, signInWithMicrosoft, signInWithApple, signInWithTwitter, signInWithGitHub,
      signUpWithEmail, signInWithEmail, resetPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function friendlyError(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
    'auth/invalid-credential':   'Incorrect email or password.',
  };
  return map[code] || err.message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
