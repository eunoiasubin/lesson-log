import { renderHeaderFooter, subjectClass } from "./main.js";
import { fetchUnits, fetchLessons, findUnit, findLesson } from "./store.js";
import { SITE } from "./site.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderHeaderFooter("list");

  const [units, lessons] = await Promise.all([fetchUnits(), fetchLessons()]);

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");
  const lesson = findLesson(lessons, requestedId) || lessons[0];
  if (!lesson) return;
  const unit = findUnit(units, lesson.unitId);

  document.title = `${lesson.title} — ${SITE.name}`;

  renderHead();
  renderRail();
  renderFlow();
  renderTools();
  renderFiles();
  renderPhotos();
  renderReflection();
  renderHistory();
  renderReviews();
  renderComments();
  renderLessonNav();
  bindActions();

  function renderHead() {
    document.getElementById("lessonBreadcrumb").innerHTML = `
      <a href="index.html">홈</a><span class="sep">/</span>
      <a href="list.html">수업 목록</a><span class="sep">/</span>
      <span>${unit.name}</span>
    `;
    document.getElementById("lessonTab").textContent = unit.subject;
    document.getElementById("lessonTab").className = "card-tab card-tab--inline " + subjectClass(unit.subject);
    document.getElementById("lessonSub").textContent =
      `${unit.grade}학년 ${unit.semester}학기 · ${unit.name} · ${lesson.no}`;
    document.getElementById("lessonTitle").textContent = lesson.title;
    document.getElementById("lessonTags").innerHTML = lesson.tags
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");
  }

  function renderRail() {
    document.getElementById("standardsList").innerHTML = lesson.standards
      .map((s) => `<div class="standard-item"><span class="code">${s.code}</span><span>${s.text}</span></div>`)
      .join("");
    document.getElementById("objectiveText").textContent = lesson.objective;
    document.getElementById("materialsText").textContent = lesson.materials || "별도 준비물 없음";
    document.getElementById("targetText").textContent = lesson.target || "대상 정보 없음";
  }

  function renderFlow() {
    document.getElementById("flowBody").innerHTML = lesson.flow
      .map(
        (row) => `
        <tr>
          <td data-label="단계"><span class="stage-pill">${row.stage}</span></td>
          <td data-label="활동">${row.activity}</td>
          <td data-label="교수학습 활동">${row.teaching}</td>
          <td data-label="시간">${row.minutes}분</td>
          <td data-label="자료 및 유의점">${row.note || "—"}</td>
        </tr>`
      )
      .join("");
  }

  function renderTools() {
    const mount = document.getElementById("toolsBlock");
    if (!lesson.tools.length) {
      mount.closest(".block").style.display = "none";
      return;
    }
    mount.innerHTML = lesson.tools
      .map(
        (t) => `
        <div class="tool-card">
          <div class="tool-preview">미리보기 자리<br>(2단계 이후 iframe)</div>
          <div class="tool-info">
            <h3><a href="${t.link}">${t.name}</a></h3>
            <p>${t.desc}</p>
            <div class="tool-method">${t.method}</div>
          </div>
        </div>`
      )
      .join("");
  }

  function renderFiles() {
    const mount = document.getElementById("filesBlock");
    if (!lesson.fileLinks.length) {
      mount.closest(".block").style.display = "none";
      return;
    }
    mount.innerHTML = lesson.fileLinks
      .map((f) => `<li><span>${f.name}</span><a class="icon-btn" href="${f.url}">열기</a></li>`)
      .join("");
  }

  function renderPhotos() {
    const mount = document.getElementById("photosBlock");
    if (!lesson.photos.length) {
      mount.closest(".block").style.display = "none";
      return;
    }
    mount.innerHTML = lesson.photos
      .map((p) =>
        p.url
          ? `<figure class="photo-item"><img src="${p.url}" alt="${p.caption || ""}" loading="lazy" /><figcaption>${p.caption || ""}</figcaption></figure>`
          : `<div class="photo-placeholder"><span>${p.caption}</span></div>`
      )
      .join("");
  }

  function renderReflection() {
    const evalMount = document.getElementById("evaluationText");
    evalMount.textContent = lesson.evaluation || "작성된 평가 내용이 없습니다.";

    const r = lesson.reflection || {};
    const items = [
      ["잘된 점", r.good],
      ["아쉬운 점", r.regret],
      ["학생 반응", r.reaction],
      ["다음엔 바꿀 점", r.next],
    ].filter(([, v]) => v);

    const mount = document.getElementById("reflectGrid");
    if (!items.length) {
      mount.closest(".block").querySelector(".reflect-grid").remove();
      return;
    }
    mount.innerHTML = items
      .map(([label, text]) => `<div class="reflect-item"><h4>${label}</h4><p>${text}</p></div>`)
      .join("");
  }

  function renderHistory() {
    const mount = document.getElementById("historyBlock");
    if (!lesson.history.length) {
      mount.closest(".block").style.display = "none";
      return;
    }
    mount.innerHTML = lesson.history
      .map(
        (h) => `
        <li class="history-item">
          <span class="history-date">${h.date}</span>
          <span>${h.change}${h.by ? ` <span style="color:var(--ink-faint)">(${h.by})</span>` : ""}</span>
        </li>`
      )
      .join("");
  }

  function renderReviews() {
    document.getElementById("reviewCount").textContent = lesson.appliedCount;
    const mount = document.getElementById("reviewsList");
    if (!lesson.reviews.length) {
      mount.innerHTML = '<p class="comment-form-stub">아직 적용 후기가 없습니다. 이 수업을 적용해 보셨다면 첫 후기를 남겨 주세요.</p>';
      return;
    }
    mount.innerHTML = lesson.reviews
      .map(
        (r) => `
        <div class="review-item">
          <div class="review-item-head"><span>${r.grade} 적용</span><span>${r.date}</span></div>
          <p><strong>바꾼 점</strong> ${r.change}</p>
          <p><strong>학생 반응</strong> ${r.reaction}</p>
        </div>`
      )
      .join("");
  }

  function renderComments() {
    const mount = document.getElementById("commentsList");
    if (!lesson.comments.length) {
      mount.innerHTML = '<p class="comment-form-stub">아직 댓글이 없습니다. 질문이나 제안을 가장 먼저 남겨 보세요.</p>';
      return;
    }
    mount.innerHTML = lesson.comments
      .map((c) => {
        const waiting = c.type === "질문" && !c.answered;
        return `
        <div class="comment-item">
          <div class="comment-head">
            <span><strong>${c.author}</strong> · <span class="comment-type ${waiting ? "waiting" : ""}">${c.type}${waiting ? " · 답변 대기" : ""}</span></span>
            <span>${c.date}</span>
          </div>
          <p>${c.content}</p>
        </div>`;
      })
      .join("");
  }

  function renderLessonNav() {
    const sorted = [...lessons].sort((a, b) => a.id.localeCompare(b.id));
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    const prev = sorted[idx - 1];
    const next = sorted[idx + 1];
    const mount = document.getElementById("lessonNav");
    mount.innerHTML = `
      ${prev ? `<a href="lesson.html?id=${prev.id}"><span class="dir">← 이전 차시</span>${prev.title}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="lesson.html?id=${next.id}"><span class="dir">다음 차시 →</span>${next.title}</a>` : "<span></span>"}
    `;
  }

  function bindActions() {
    document.getElementById("copyLinkBtn").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.textContent = "복사됨";
        setTimeout(() => (btn.textContent = original), 1500);
      } catch {
        alert(window.location.href);
      }
    });
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    document.getElementById("bookmarkBtn").addEventListener("click", (e) => {
      e.currentTarget.classList.toggle("is-active");
    });
  }
});
