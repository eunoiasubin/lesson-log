import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* Firebase 웹 설정값은 공개되어도 안전하다. 실제 접근 제어는 Firestore 보안 규칙(9단계)이 담당한다. */
const firebaseConfig = {
  apiKey: "AIzaSyDNry3vM2FcfnCrrqugG-Xh2waiDe3J3xQ",
  authDomain: "homepage-7a04e.firebaseapp.com",
  projectId: "homepage-7a04e",
  storageBucket: "homepage-7a04e.firebasestorage.app",
  messagingSenderId: "1067859458447",
  appId: "1:1067859458447:web:f4d8f20c5ec28c71efb3fa",
  measurementId: "G-0BEY2E76T8",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
