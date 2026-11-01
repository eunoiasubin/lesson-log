import { signInWithGoogle, signOutUser, onAuthChange } from "./auth.js";
import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let started = false;

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function notify(member) {
  window.dispatchEvent(new CustomEvent("member:change", { detail: member }));
}

/* 회원 로그인 상태는 페이지마다 다시 구독하지 않고 이 한 번의 구독을 이벤트로 공유한다. */
function start() {
  if (started) return;
  started = true;
  onAuthChange(async (user) => {
    if (!user) {
      notify(null);
      return;
    }
    const ref = doc(db, "members", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      notify({ pending: true });
      const data = await openOnboardingModal(ref);
      notify({ uid: user.uid, ...data });
    } else {
      notify({ uid: user.uid, ...snap.data() });
    }
  });
}

export function onMemberChange(callback) {
  start();
  window.addEventListener("member:change", (e) => callback(e.detail));
}

export function mountAuthArea(container) {
  onMemberChange((member) => {
    if (member === null) {
      renderLoggedOut(container);
    } else if (member.pending) {
      container.innerHTML = `<span class="field-note">로그인 중…</span>`;
    } else {
      renderLoggedIn(container, member);
    }
  });
}

function renderLoggedOut(container) {
  container.innerHTML = `<button class="icon-btn" type="button" id="memberLoginBtn">로그인</button>`;
  document.getElementById("memberLoginBtn").addEventListener("click", () => {
    signInWithGoogle().catch((err) => alert("로그인 실패: " + err.message));
  });
}

function renderLoggedIn(container, member) {
  container.innerHTML = `
    <span class="member-name">${escapeHTML(member.nickname)}님</span>
    <a class="icon-btn" href="mypage.html">마이페이지</a>
    <button class="icon-btn" type="button" id="memberLogoutBtn">로그아웃</button>
  `;
  document.getElementById("memberLogoutBtn").addEventListener("click", () => signOutUser());
}

function openOnboardingModal(ref) {
  return new Promise((resolve) => {
    let overlay = document.getElementById("memberOnboardModal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "memberOnboardModal";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal">
          <div class="modal-head"><h2>처음 오셨네요</h2></div>
          <p class="field-note">닉네임만 다른 사람에게 보입니다. 실명과 학교명은 받지 않습니다.</p>
          <form id="memberOnboardForm" class="form-grid">
            <div class="field field-wide">
              <label for="memberNickname">닉네임</label>
              <input type="text" id="memberNickname" maxlength="20" required />
            </div>
            <div class="field">
              <label for="memberGrade">담당 학년 (선택)</label>
              <input type="text" id="memberGrade" placeholder="예: 3학년" />
            </div>
            <div class="field">
              <label for="memberSubject">담당 과목 (선택)</label>
              <input type="text" id="memberSubject" placeholder="예: 과학" />
            </div>
            <label class="consent-check field-wide">
              <input type="checkbox" id="memberConsent" required />
              개인정보 수집·이용에 동의합니다 (닉네임, 담당 학년·과목, 로그인 이메일 저장).
            </label>
            <div class="form-actions">
              <span></span>
              <button type="submit" class="btn btn-primary">시작하기</button>
            </div>
          </form>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.hidden = false;

    const form = document.getElementById("memberOnboardForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nickname = document.getElementById("memberNickname").value.trim();
      if (!nickname) return;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const data = {
        nickname,
        grade: document.getElementById("memberGrade").value.trim(),
        subject: document.getElementById("memberSubject").value.trim(),
        role: "member",
        writeRestricted: false,
        joinedAt: serverTimestamp(),
        consentAt: serverTimestamp(),
      };
      try {
        await setDoc(ref, data);
        overlay.hidden = true;
        resolve(data);
      } catch (err) {
        alert("저장 실패: " + err.message);
        submitBtn.disabled = false;
      }
    };
  });
}
