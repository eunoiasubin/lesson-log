import { renderHeaderFooter } from "./main.js";
import { onAuthChange, signInWithGoogle, signOutUser, isAdmin } from "./auth.js";
import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let units = [];
let lessons = [];
let editingUnitId = null;
let editingLessonId = null;
let standardsRepeater, flowRepeater, toolsRepeater, fileLinksRepeater;
let pendingPhotos = [];

document.addEventListener("DOMContentLoaded", () => {
  renderHeaderFooter("");
  wireStaticControls();
  initRepeaters();
  wireAuthGate();
});

/* ---------- 인증 ---------- */

function wireAuthGate() {
  const gate = document.getElementById("authGate");
  const panel = document.getElementById("adminPanel");

  onAuthChange(async (user) => {
    if (!user) {
      panel.hidden = true;
      gate.hidden = false;
      gate.innerHTML = `
        <div class="auth-card">
          <h1>관리자 로그인</h1>
          <p>이 화면은 로그인하지 않으면 보이지 않습니다. 구글 계정으로 로그인해 주세요.</p>
          <button class="btn btn-primary" type="button" id="loginBtn">구글로 로그인</button>
        </div>`;
      document.getElementById("loginBtn").addEventListener("click", () => {
        signInWithGoogle().catch((err) => alert("로그인 실패: " + err.message));
      });
      return;
    }

    if (!isAdmin(user)) {
      panel.hidden = true;
      gate.hidden = false;
      gate.innerHTML = `
        <div class="auth-card">
          <h1>관리자 권한이 없습니다</h1>
          <p>${user.email} 계정은 관리자로 등록되어 있지 않습니다. 이 화면은 글쓴이 1명만 쓸 수 있습니다.</p>
          <button class="icon-btn" type="button" id="logoutBtn">로그아웃</button>
        </div>`;
      document.getElementById("logoutBtn").addEventListener("click", () => signOutUser());
      return;
    }

    gate.hidden = true;
    panel.hidden = false;
    document.getElementById("adminWhoami").textContent = `${user.email} 으로 로그인됨`;
    await refreshUnits();
    await refreshLessons();
  });
}

/* ---------- 탭/모달/삭제 버튼 등 고정 UI ---------- */

function wireStaticControls() {
  document.getElementById("signOutBtn").addEventListener("click", () => signOutUser());

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const target = tab.dataset.tab;
      document.getElementById("unitsTab").hidden = target !== "units";
      document.getElementById("lessonsTab").hidden = target !== "lessons";
    });
  });

  document.getElementById("newUnitBtn").addEventListener("click", () => openUnitModal(null));
  document.getElementById("unitModalClose").addEventListener("click", closeUnitModal);
  document.getElementById("unitForm").addEventListener("submit", onUnitFormSubmit);
  wireDeleteButton(document.getElementById("unitDeleteBtn"), onUnitDelete);

  document.getElementById("newLessonBtn").addEventListener("click", () => openLessonModal(null));
  document.getElementById("lessonModalClose").addEventListener("click", closeLessonModal);
  document.getElementById("lessonForm").addEventListener("submit", onLessonFormSubmit);
  wireDeleteButton(document.getElementById("lessonDeleteBtn"), onLessonDelete);

  const consentBox = document.getElementById("photoConsent");
  const photoInput = document.getElementById("photoFileInput");
  consentBox.addEventListener("change", () => {
    photoInput.disabled = !consentBox.checked;
  });
  photoInput.addEventListener("change", async () => {
    if (!photoInput.files.length) return;
    const { editAndUploadPhotos } = await import("./photo-editor.js");
    const added = await editAndUploadPhotos(photoInput.files);
    pendingPhotos.push(...added);
    photoInput.value = "";
    renderPhotoThumbs();
  });
}

function renderPhotoThumbs() {
  const mount = document.getElementById("photosThumbs");
  mount.innerHTML = pendingPhotos
    .map(
      (p, i) => `
      <div class="photo-thumb" data-index="${i}">
        <img src="${p.url}" alt="" />
        <input type="text" class="photo-thumb-caption" data-index="${i}" value="${escapeHTML(p.caption || "")}" placeholder="사진 설명" />
        <button type="button" class="photo-thumb-remove" data-index="${i}">삭제</button>
      </div>`
    )
    .join("");

  mount.querySelectorAll(".photo-thumb-caption").forEach((input) => {
    input.addEventListener("input", () => {
      pendingPhotos[Number(input.dataset.index)].caption = input.value;
    });
  });
  mount.querySelectorAll(".photo-thumb-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingPhotos.splice(Number(btn.dataset.index), 1);
      renderPhotoThumbs();
    });
  });
}

function wireDeleteButton(btn, onConfirmed) {
  let armed = false;
  let timer = null;
  const original = btn.textContent;
  btn.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      btn.textContent = "정말 삭제할까요? (다시 클릭)";
      timer = setTimeout(() => {
        armed = false;
        btn.textContent = original;
      }, 3000);
      return;
    }
    clearTimeout(timer);
    armed = false;
    btn.textContent = original;
    onConfirmed();
  });
}

/* ---------- 반복 입력(성취기준/수업 흐름/수업 도구/자료 링크) ---------- */

function createRepeater(container, fields, emptyRow) {
  let rows = [];

  function fieldHTML(f, value) {
    const v = value === undefined || value === null ? "" : value;
    if (f.type === "textarea") {
      return `<textarea data-field="${f.key}" placeholder="${f.label}">${escapeHTML(v)}</textarea>`;
    }
    if (f.type === "select") {
      return `<select data-field="${f.key}">${f.options
        .map((o) => `<option value="${o}" ${o === v ? "selected" : ""}>${o}</option>`)
        .join("")}</select>`;
    }
    return `<input type="${f.type || "text"}" data-field="${f.key}" placeholder="${f.label}" value="${escapeHTML(v)}" />`;
  }

  function render() {
    container.innerHTML =
      rows
        .map(
          (row, i) => `
        <div class="repeater-row" data-index="${i}">
          ${fields.map((f) => `<div class="repeater-field repeater-field--${f.type || "text"}">${fieldHTML(f, row[f.key])}</div>`).join("")}
          <button type="button" class="icon-btn repeater-remove" data-index="${i}">삭제</button>
        </div>`
        )
        .join("") + `<button type="button" class="icon-btn repeater-add">+ 추가</button>`;

    container.querySelectorAll(".repeater-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        rows.splice(Number(btn.dataset.index), 1);
        render();
      });
    });
    container.querySelector(".repeater-add").addEventListener("click", () => {
      rows.push({ ...emptyRow });
      render();
    });
    container.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const i = Number(input.closest(".repeater-row").dataset.index);
        rows[i][input.dataset.field] = input.type === "number" ? Number(input.value) : input.value;
      });
    });
  }

  return {
    setRows(newRows) {
      rows = (newRows || []).map((r) => ({ ...r }));
      render();
    },
    getRows() {
      return rows.filter((r) => Object.values(r).some((v) => v !== "" && v !== undefined && v !== null));
    },
  };
}

function initRepeaters() {
  standardsRepeater = createRepeater(
    document.getElementById("standardsRepeater"),
    [
      { key: "code", label: "코드 (예: 4과15-02)" },
      { key: "text", label: "성취기준 문장" },
    ],
    { code: "", text: "" }
  );

  flowRepeater = createRepeater(
    document.getElementById("flowRepeater"),
    [
      { key: "stage", label: "단계", type: "select", options: ["도입", "전개", "정리"] },
      { key: "activity", label: "활동명" },
      { key: "teaching", label: "교수학습 활동", type: "textarea" },
      { key: "minutes", label: "시간(분)", type: "number" },
      { key: "note", label: "자료 및 유의점" },
    ],
    { stage: "도입", activity: "", teaching: "", minutes: 5, note: "" }
  );

  toolsRepeater = createRepeater(
    document.getElementById("toolsRepeater"),
    [
      { key: "name", label: "도구 이름" },
      { key: "link", label: "링크(URL)" },
      { key: "desc", label: "한 줄 설명" },
      { key: "method", label: "만든 방법 (예: 바이브코딩)" },
    ],
    { name: "", link: "", desc: "", method: "" }
  );

  fileLinksRepeater = createRepeater(
    document.getElementById("fileLinksRepeater"),
    [
      { key: "name", label: "자료 이름" },
      { key: "url", label: "구글 드라이브 링크" },
    ],
    { name: "", url: "" }
  );
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- 수업(단원) ---------- */

async function refreshUnits() {
  const snap = await getDocs(collection(db, "units"));
  units = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  renderUnitsList();
  fillUnitSelect();
}

function renderUnitsList() {
  const mount = document.getElementById("unitsList");
  if (!units.length) {
    mount.innerHTML = `<p class="empty-state">아직 만든 수업(단원)이 없습니다.</p>`;
    return;
  }
  mount.innerHTML = units
    .map(
      (u) => `
      <div class="admin-list-item">
        <div>
          <div class="admin-list-item-title">${u.grade}학년 ${u.semester}학기 · ${u.subject} · ${u.name}</div>
          <div class="admin-list-item-sub">${u.oneLiner || ""}</div>
        </div>
        <button class="icon-btn" type="button" data-edit-unit="${u.id}">수정</button>
      </div>`
    )
    .join("");

  mount.querySelectorAll("[data-edit-unit]").forEach((btn) => {
    btn.addEventListener("click", () => openUnitModal(btn.dataset.editUnit));
  });
}

function fillUnitSelect() {
  const sel = document.getElementById("lessonUnit");
  const current = sel.value;
  sel.innerHTML = units
    .map((u) => `<option value="${u.id}">${u.grade}학년 ${u.semester}학기 · ${u.name}</option>`)
    .join("");
  if (current) sel.value = current;
}

function openUnitModal(unitId) {
  editingUnitId = unitId;
  const modal = document.getElementById("unitModal");
  const form = document.getElementById("unitForm");
  form.reset();

  if (unitId) {
    const u = units.find((x) => x.id === unitId);
    document.getElementById("unitModalTitle").textContent = "수업 수정";
    document.getElementById("unitGrade").value = u.grade;
    document.getElementById("unitSemester").value = String(u.semester);
    document.getElementById("unitSubject").value = u.subject;
    document.getElementById("unitName").value = u.name;
    document.getElementById("unitOneLiner").value = u.oneLiner || "";
    document.getElementById("unitRestructureNote").value = u.restructureNote || "";
    document.getElementById("unitDeleteBtn").hidden = false;
  } else {
    document.getElementById("unitModalTitle").textContent = "새 수업 만들기";
    document.getElementById("unitDeleteBtn").hidden = true;
  }
  modal.hidden = false;
}

function closeUnitModal() {
  document.getElementById("unitModal").hidden = true;
  editingUnitId = null;
}

async function onUnitFormSubmit(e) {
  e.preventDefault();
  const payload = {
    grade: Number(document.getElementById("unitGrade").value),
    semester: Number(document.getElementById("unitSemester").value),
    subject: document.getElementById("unitSubject").value.trim(),
    name: document.getElementById("unitName").value.trim(),
    oneLiner: document.getElementById("unitOneLiner").value.trim(),
    restructureNote: document.getElementById("unitRestructureNote").value.trim(),
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (editingUnitId) {
      await setDoc(doc(db, "units", editingUnitId), payload, { merge: true });
    } else {
      await addDoc(collection(db, "units"), payload);
    }
    closeUnitModal();
    await refreshUnits();
  } catch (err) {
    alert("저장 실패: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

async function onUnitDelete() {
  if (!editingUnitId) return;
  const linked = lessons.filter((l) => l.unitId === editingUnitId);
  if (linked.length && !confirm(`이 수업에 연결된 차시가 ${linked.length}개 있습니다. 단원만 삭제하고 차시는 그대로 두시겠어요?`)) {
    return;
  }
  try {
    await deleteDoc(doc(db, "units", editingUnitId));
    closeUnitModal();
    await refreshUnits();
  } catch (err) {
    alert("삭제 실패: " + err.message);
  }
}

/* ---------- 차시 ---------- */

async function refreshLessons() {
  const snap = await getDocs(collection(db, "lessons"));
  lessons = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id));
  renderLessonsList();
}

function renderLessonsList() {
  const mount = document.getElementById("lessonsList");
  if (!lessons.length) {
    mount.innerHTML = `<p class="empty-state">아직 만든 차시가 없습니다.</p>`;
    return;
  }
  mount.innerHTML = lessons
    .map((l) => {
      const unit = units.find((u) => u.id === l.unitId);
      return `
      <div class="admin-list-item">
        <div>
          <div class="admin-list-item-title">${l.title} <span class="status-pill ${l.visibility === "공개" ? "is-public" : "is-draft"}">${l.visibility}</span></div>
          <div class="admin-list-item-sub">${unit ? `${unit.grade}학년 ${unit.semester}학기 · ${unit.name} · ` : ""}${l.no || ""}</div>
        </div>
        <button class="icon-btn" type="button" data-edit-lesson="${l.id}">수정</button>
      </div>`;
    })
    .join("");

  mount.querySelectorAll("[data-edit-lesson]").forEach((btn) => {
    btn.addEventListener("click", () => openLessonModal(btn.dataset.editLesson));
  });
}

function openLessonModal(lessonId) {
  editingLessonId = lessonId;
  const modal = document.getElementById("lessonModal");
  const form = document.getElementById("lessonForm");
  form.reset();
  fillUnitSelect();

  if (lessonId) {
    const l = lessons.find((x) => x.id === lessonId);
    document.getElementById("lessonModalTitle").textContent = "차시 수정";
    document.getElementById("lessonUnit").value = l.unitId;
    document.getElementById("lessonNo").value = l.no || "";
    document.getElementById("lessonTitle").value = l.title || "";
    document.getElementById("lessonDate").value = l.date || "";
    document.getElementById("lessonTarget").value = l.target || "";
    document.getElementById("lessonObjective").value = l.objective || "";
    document.getElementById("lessonMaterials").value = l.materials || "";
    document.getElementById("lessonEvaluation").value = l.evaluation || "";
    const r = l.reflection || {};
    document.getElementById("reflectGood").value = r.good || "";
    document.getElementById("reflectRegret").value = r.regret || "";
    document.getElementById("reflectReaction").value = r.reaction || "";
    document.getElementById("reflectNext").value = r.next || "";
    document.getElementById("lessonTags").value = (l.tags || []).join(", ");
    document.getElementById("lessonVisibility").value = l.visibility || "비공개";
    standardsRepeater.setRows(l.standards);
    flowRepeater.setRows(l.flow);
    toolsRepeater.setRows(l.tools);
    fileLinksRepeater.setRows(l.fileLinks);
    pendingPhotos = (l.photos || []).filter((p) => p.url).map((p) => ({ ...p }));
    document.getElementById("lessonDeleteBtn").hidden = false;
  } else {
    document.getElementById("lessonModalTitle").textContent = "새 차시 만들기";
    document.getElementById("lessonVisibility").value = "비공개";
    standardsRepeater.setRows([]);
    flowRepeater.setRows([]);
    toolsRepeater.setRows([]);
    fileLinksRepeater.setRows([]);
    pendingPhotos = [];
    document.getElementById("lessonDeleteBtn").hidden = true;
  }
  document.getElementById("photoConsent").checked = false;
  document.getElementById("photoFileInput").disabled = true;
  document.getElementById("photoFileInput").value = "";
  renderPhotoThumbs();
  modal.hidden = false;
}

function closeLessonModal() {
  document.getElementById("lessonModal").hidden = true;
  editingLessonId = null;
}

async function onLessonFormSubmit(e) {
  e.preventDefault();

  const unitId = document.getElementById("lessonUnit").value;
  if (!unitId) {
    alert("수업(단원)을 먼저 만들어 주세요.");
    return;
  }

  const payload = {
    unitId,
    no: document.getElementById("lessonNo").value.trim(),
    title: document.getElementById("lessonTitle").value.trim(),
    date: document.getElementById("lessonDate").value,
    target: document.getElementById("lessonTarget").value.trim(),
    standards: standardsRepeater.getRows(),
    objective: document.getElementById("lessonObjective").value.trim(),
    materials: document.getElementById("lessonMaterials").value.trim(),
    flow: flowRepeater.getRows(),
    tools: toolsRepeater.getRows(),
    fileLinks: fileLinksRepeater.getRows(),
    photos: pendingPhotos.map((p) => ({ url: p.url, caption: p.caption || "" })),
    evaluation: document.getElementById("lessonEvaluation").value.trim(),
    reflection: {
      good: document.getElementById("reflectGood").value.trim(),
      regret: document.getElementById("reflectRegret").value.trim(),
      reaction: document.getElementById("reflectReaction").value.trim(),
      next: document.getElementById("reflectNext").value.trim(),
    },
    tags: document
      .getElementById("lessonTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    visibility: document.getElementById("lessonVisibility").value,
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (editingLessonId) {
      /* merge:true로 저장해 댓글·후기·수정이력처럼 이 폼에 없는 필드는 그대로 둔다. */
      await setDoc(doc(db, "lessons", editingLessonId), payload, { merge: true });
    } else {
      await addDoc(collection(db, "lessons"), {
        ...payload,
        reviews: [],
        comments: [],
        history: [],
        appliedCount: 0,
      });
    }
    closeLessonModal();
    await refreshLessons();
  } catch (err) {
    alert("저장 실패: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

async function onLessonDelete() {
  if (!editingLessonId) return;
  try {
    await deleteDoc(doc(db, "lessons", editingLessonId));
    closeLessonModal();
    await refreshLessons();
  } catch (err) {
    alert("삭제 실패: " + err.message);
  }
}
