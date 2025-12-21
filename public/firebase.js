import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyAD-_qZFZWQDXnQOj9E9u4qtgRbq5SyXOY",
  authDomain: "digibookshelf-7a1f8.firebaseapp.com",
  projectId: "digibookshelf-7a1f8",
  storageBucket: "digibookshelf-7a1f8.firebasestorage.app",
  messagingSenderId: "970307169766",
  appId: "1:970307169766:web:007c2653ec1e796777fa27",
  measurementId: "G-TTMQ1LEPTZ"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
