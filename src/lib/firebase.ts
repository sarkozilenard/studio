import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAsL3Y7vwoNHQZSsMqIl7BFBsMnr2T5jkE",
    authDomain: "pdf-kitolto.firebaseapp.com",
    projectId: "pdf-kitolto",
    storageBucket: "pdf-kitolto.appspot.com",
    messagingSenderId: "606747139863",
    appId: "1:606747139863:web:a01e0ca6251471aec62152",
    measurementId: "G-D2S255WNWF"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
