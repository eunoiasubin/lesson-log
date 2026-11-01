import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let unitsCache = null;
let lessonsCache = null;

export async function fetchUnits() {
  if (unitsCache) return unitsCache;
  const snap = await getDocs(collection(db, "units"));
  unitsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return unitsCache;
}

export async function fetchLessons() {
  if (lessonsCache) return lessonsCache;
  const snap = await getDocs(collection(db, "lessons"));
  lessonsCache = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return lessonsCache;
}

export function findUnit(units, unitId) {
  return units.find((u) => u.id === unitId);
}

export function findLesson(lessons, lessonId) {
  return lessons.find((l) => l.id === lessonId);
}
