import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAWE-YwhHdTcNJm-Fu82CIRHcFDaUAnURY",
  authDomain: "lionstrikeaction.firebaseapp.com",
  projectId: "lionstrikeaction",
  storageBucket: "lionstrikeaction.firebasestorage.app",
  messagingSenderId: "845308838645",
  appId: "1:845308838645:web:89dd5c970279ac535b3bbc",
  measurementId: "G-FPFS7MECVZ",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
