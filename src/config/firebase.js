// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const database = getDatabase(app);
export const analytics = getAnalytics(app);

export default app;
