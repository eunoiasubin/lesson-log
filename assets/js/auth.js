import { app } from "./firebase-init.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/* 관리자 1명만 허용한다. 9단계에서 Firestore 보안 규칙에 실제 UID로 다시 건다. */
export const ADMIN_EMAIL = "soobin0630@naver.com";

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function isAdmin(user) {
  return !!user && user.email === ADMIN_EMAIL;
}
