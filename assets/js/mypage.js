import { renderHeaderFooter } from "./main.js";
import { auth, signInWithGoogle, signOutUser } from "./auth.js";
import { onMemberChange } from "./member.js";
import { db } from "./firebase-init.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  renderHeaderFooter("");
  wireWithdraw();

  onMemberChange((member) => {
    const gate = document.getElementById("mypageGate");
    const panel = document.getElementById("mypagePanel");

    if (member === null) {
      panel.hidden = true;
      gate.hidden = false;
      gate.innerHTML = `
        <div class="auth-card">
          <h1>로그인이 필요합니다</h1>
          <p>마이페이지는 로그인한 선생님만 볼 수 있습니다.</p>
          <button class="btn btn-primary" type="button" id="mypageLoginBtn">구글로 로그인</button>
        </div>`;
      document.getElementById("mypageLoginBtn").addEventListener("click", () => {
        signInWithGoogle().catch((err) => alert("로그인 실패: " + err.message));
      });
      return;
    }

    if (member.pending) {
      panel.hidden = true;
      gate.hidden = false;
      gate.innerHTML = `<div class="auth-card"><p class="field-note">회원 정보를 설정하는 중입니다.</p></div>`;
      return;
    }

    gate.hidden = true;
    panel.hidden = false;
    document.getElementById("mypageNickname").textContent = `${member.nickname}님`;
    const metaParts = [];
    if (member.grade) metaParts.push(`담당 학년: ${member.grade}`);
    if (member.subject) metaParts.push(`담당 과목: ${member.subject}`);
    document.getElementById("mypageMeta").textContent =
      metaParts.length ? metaParts.join(" · ") : "담당 학년·과목을 설정하지 않았습니다.";
  });
});

function wireWithdraw() {
  const btn = document.getElementById("withdrawBtn");
  let armed = false;
  let timer = null;
  const original = btn.textContent;

  btn.addEventListener("click", async () => {
    if (!armed) {
      armed = true;
      btn.textContent = "정말 탈퇴할까요? (다시 클릭)";
      timer = setTimeout(() => {
        armed = false;
        btn.textContent = original;
      }, 3000);
      return;
    }
    clearTimeout(timer);
    const user = auth.currentUser;
    if (!user) return;
    btn.disabled = true;
    try {
      await deleteDoc(doc(db, "members", user.uid));
      await signOutUser();
      window.location.href = "index.html";
    } catch (err) {
      alert("탈퇴 처리에 실패했습니다: " + err.message);
      btn.disabled = false;
      armed = false;
      btn.textContent = original;
    }
  });
}
