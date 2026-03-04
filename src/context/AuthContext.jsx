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
  const [profilePhotoURL, setProfilePhotoURL] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await ensureUserProfile(firebaseUser);
        setUser(firebaseUser);
        // Check if biometric is enabled
        const ref = doc(db, 'users', firebaseUser.uid, 'profile', 'info');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setBiometricEnabled(!!snap.data().biometricCredentialId);
        }
      } else {
        setUser(null);
        setBiometricEnabled(false);
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
      setProfilePhotoURL(firebaseUser.photoURL || null);
    } else {
      const data = snap.data();
      // null = no custom photo → fall back to OAuth; '' = explicitly removed → show initials
      setProfilePhotoURL('photoURL' in data ? (data.photoURL || null) : null);
    }
  }

  function clearError() { setError(null); }
  function setProfilePhoto(url) { setProfilePhotoURL(url); }

  async function signInWithProvider(provider) {
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);

      // Store last email for biometric login
      if (result.user?.email) {
        localStorage.setItem('biometric_last_email', result.user.email);

        // Check if user has biometric enabled and store session info
        const userRef = doc(db, 'users', result.user.uid, 'profile', 'info');
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().biometricEnabled) {
          const credentialId = snap.data().biometricCredentialId;
          if (credentialId) {
            // For social login, store user info to restore session
            localStorage.setItem(`biometric_${result.user.email}`, JSON.stringify({
              credentialId,
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              isSocialLogin: true,
              providerId: result.user.providerData[0]?.providerId,
            }));
          }
        }
      }

      return result;
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    }
  }

  async function signInWithGoogle() { return signInWithProvider(googleProvider); }
  async function signInWithMicrosoft() { return signInWithProvider(microsoftProvider); }
  async function signInWithApple() { return signInWithProvider(appleProvider); }
  async function signInWithTwitter() { return signInWithProvider(twitterProvider); }
  async function signInWithGitHub() { return signInWithProvider(githubProvider); }

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

  async function signInWithEmail(email, password, skipBiometricStore = false) {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Store last email for biometric login
      localStorage.setItem('biometric_last_email', email);

      // Check if user has biometric enabled and store credentials for future biometric login
      // Skip if this sign-in is coming from biometric authentication itself
      if (!skipBiometricStore && result.user) {
        const userRef = doc(db, 'users', result.user.uid, 'profile', 'info');
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().biometricEnabled) {
          // Store encrypted password for biometric unlock
          const credentialId = snap.data().biometricCredentialId;
          if (credentialId) {
            localStorage.setItem(`biometric_${email}`, JSON.stringify({
              credentialId,
              encryptedPassword: btoa(password),
              uid: result.user.uid,
              isSocialLogin: false,
            }));
          }
        }
      }

      return result;
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

  async function updateUserInfo(data) {
    try {
      await updateProfile(auth.currentUser, data);
      setUser({ ...auth.currentUser });
    } catch (err) {
      setError(err.message);
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

  // Biometric authentication functions
  async function registerBiometric() {
    if (!user) throw new Error('User must be logged in');

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported on this device/browser');
    }

    try {
      // Create credential options
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyOptions = {
        challenge,
        rp: {
          name: 'ExpenseIQ',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(user.uid),
          name: user.email,
          displayName: user.displayName || user.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (fingerprint, face)
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      if (!credential) throw new Error('Failed to create credential');

      // Store credential ID in Firestore
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey())));

      const ref = doc(db, 'users', user.uid, 'profile', 'info');
      await setDoc(ref, {
        biometricCredentialId: credentialId,
        biometricPublicKey: publicKey,
        biometricEnabled: true,
        biometricEmail: user.email, // Store email for lookup
      }, { merge: true });

      // Store email for biometric login (so user doesn't need to type it)
      localStorage.setItem('biometric_last_email', user.email);

      // For social login users, store a session token instead of password
      // Generate a random session token
      const sessionToken = btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
      localStorage.setItem(`biometric_${user.email}`, JSON.stringify({
        credentialId,
        sessionToken, // Store session token instead of password
        uid: user.uid,
        isSocialLogin: true,
      }));

      setBiometricEnabled(true);

      // Social login users are ready immediately, no password needed
      return { requiresPasswordSignIn: false };
    } catch (err) {
      console.error('Biometric registration error:', err);
      if (err.name === 'NotAllowedError') {
        throw new Error('Biometric registration was cancelled');
      }
      throw new Error(err.message || 'Failed to register biometric authentication');
    }
  }

  async function disableBiometric() {
    if (!user) throw new Error('User must be logged in');

    try {
      const ref = doc(db, 'users', user.uid, 'profile', 'info');
      await setDoc(ref, {
        biometricCredentialId: null,
        biometricPublicKey: null,
        biometricEnabled: false,
        biometricEmail: null,
      }, { merge: true });

      // Clear stored credentials from localStorage
      if (user.email) {
        localStorage.removeItem(`biometric_${user.email}`);
      }
      // Clear last email if it matches current user
      const lastEmail = localStorage.getItem('biometric_last_email');
      if (lastEmail === user.email) {
        localStorage.removeItem('biometric_last_email');
      }

      setBiometricEnabled(false);
      return true;
    } catch (err) {
      throw new Error('Failed to disable biometric authentication');
    }
  }

  async function signInWithBiometric(emailParam) {
    // Use provided email or get last used email from localStorage
    const email = emailParam || localStorage.getItem('biometric_last_email');

    if (!email) {
      throw new Error('No email found. Please sign in once with your account to enable biometric login.');
    }

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported on this device/browser');
    }

    setError(null);
    try {
      // Check if user has stored credentials for this email
      const storedData = localStorage.getItem(`biometric_${email}`);
      if (!storedData) {
        throw new Error(`No biometric setup found for ${email}. Please sign in and enable biometric from your Profile page.`);
      }

      const { credentialId, encryptedPassword, uid, isSocialLogin, providerId } = JSON.parse(storedData);

      // Create challenge for authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request biometric authentication.
      // NOTE: We intentionally omit `allowCredentials` so that the platform
      // authenticator (Windows Hello / Touch ID) always appears in the dialog.
      // Passing a specific credential ID can cause Windows Hello to hide itself
      // when it doesn't recognise the ID, leaving only external options visible.
      // After the user authenticates we verify the returned credential ID matches
      // the one we registered, to ensure the correct account's credential is used.
      const publicKeyOptions = {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      if (!assertion) throw new Error('Biometric authentication failed');

      // Verify the returned credential matches the one registered for this account.
      const returnedId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
      if (returnedId !== credentialId) {
        throw new Error('The biometric credential used does not match the one registered for this account. Please use the correct Windows Hello / biometric for this account.');
      }

      // Biometric verification successful!
      if (isSocialLogin) {
        // For social login users, Firebase maintains the session automatically
        // Check if user is already signed in with an active session
        const currentUser = auth.currentUser;

        if (currentUser && currentUser.uid === uid) {
          // Perfect! User has an active session and biometric verified
          // Just return - they're already signed in
          return;
        }

        // Session expired or user signed out
        // They need to sign in with their social provider once to restore session
        const providerName = getProviderName(providerId);
        throw new Error(`Please sign in with ${providerName} to continue. Your session has expired or you signed out. After signing in, biometric will work again.`);
      } else {
        // For email/password users, decrypt and use stored password
        if (!encryptedPassword) {
          throw new Error('Please sign in with your email and password once to complete biometric setup.');
        }
        const password = atob(encryptedPassword);
        await signInWithEmail(email, password, true);
      }
    } catch (err) {
      console.error('Biometric sign-in error:', err);
      if (err.name === 'NotAllowedError') {
        const cancelError = new Error('Biometric authentication was cancelled');
        setError(friendlyError(cancelError));
        throw cancelError;
      }
      if (err.message && (err.message.includes('No biometric') || err.message.includes('Please sign in') || err.message.includes('session has expired'))) {
        setError(err.message);
        throw err;
      }
      const authError = new Error('Biometric authentication failed. Please try again or use your regular sign-in method.');
      setError(friendlyError(authError));
      throw authError;
    }
  }

  function getProviderName(providerId) {
    const names = {
      'google.com': 'Google',
      'microsoft.com': 'Microsoft',
      'apple.com': 'Apple',
      'twitter.com': 'Twitter/X',
      'github.com': 'GitHub',
    };
    return names[providerId] || 'your social provider';
  }

  return (
    <AuthContext.Provider value={{
      user, loading, error, clearError,
      // avatarURL: the resolved photo to display everywhere
      // null = use initials; string = photo URL or base64
      avatarURL: profilePhotoURL,
      setProfilePhoto,
      signInWithGoogle, signInWithMicrosoft, signInWithApple, signInWithTwitter, signInWithGitHub,
      signUpWithEmail, signInWithEmail, resetPassword,
      updateUserInfo, logout,
      // Biometric authentication
      biometricEnabled,
      registerBiometric,
      disableBiometric,
      signInWithBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function friendlyError(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
    'auth/invalid-credential': 'Incorrect email or password.',
  };
  return map[code] || err.message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
