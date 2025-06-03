// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSfsBbrunA3aejnWlsMe0z1NiwJUvRNPU",
  authDomain: "xivmit.firebaseapp.com",
  databaseURL: "https://xivmit-default-rtdb.firebaseio.com",
  projectId: "xivmit",
  storageBucket: "xivmit.firebasestorage.app",
  messagingSenderId: "1056456049686",
  appId: "1:1056456049686:web:a269ab0a6d59da09462137",
  measurementId: "G-834J53ZVFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);

// Initialize Analytics (only in production)
export const analytics = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? getAnalytics(app)
  : null;

// Connect to emulators in development (optional)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Uncomment these lines if you want to use Firebase emulators in development
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
  // connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;
