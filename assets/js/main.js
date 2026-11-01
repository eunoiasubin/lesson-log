import { SITE } from "./site.js";

export function renderHeaderFooter(activePage, { showMemberAuth = true } = {}) {
  const headerMount = document.getElementById("siteHeader");
  const footerMount = document.getElementById("siteFooter");

  if (headerMount) {
    headerMount.innerHTML = `
      <div class="nav-bar">
        <a class="site-mark" href="index.html">${SITE.name} <small>${SITE.nameNote}</small></a>
        <div class="nav-right">
          <nav aria-label="주요 메뉴">
            <ul class="nav-links" id="navLinks">
              <li><a href="index.html" ${activePage === "home" ? 'aria-current="page"' : ""}>홈</a></li>
              <li><a href="list.html" ${activePage === "list" ? 'aria-current="page"' : ""}>수업 목록</a></li>
              <li><a href="about.html" ${activePage === "about" ? 'aria-current="page"' : ""}>소개</a></li>
            </ul>
          </nav>
          <div class="auth-area" id="authArea"></div>
          <button class="nav-toggle" id="navToggle" aria-label="메뉴 열기" aria-expanded="false">
            <span></span>
          </button>
        </div>
      </div>
    `;
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    if (showMemberAuth) {
      import("./member.js").then(({ mountAuthArea }) => {
        mountAuthArea(document.getElementById("authArea"));
      });
    }
  }

  if (footerMount) {
    footerMount.innerHTML = `
      <div class="wrap">
        <span>© 2026 ${SITE.name}. 바이브코딩 수업 기록 아카이브.</span>
        <span><a href="about.html">개인정보 처리방침</a> · <a href="about.html">이용 규칙</a></span>
      </div>
    `;
  }
}

export function subjectClass(subject) {
  return "subj-" + subject.replace(/\s+/g, ".");
}

export function lessonCardHTML(lesson, unit) {
  return `
    <a class="index-card" href="lesson.html?id=${lesson.id}">
      <span class="card-tab ${subjectClass(unit.subject)}">${unit.subject}</span>
      <div class="card-meta">${unit.grade}학년 ${unit.semester}학기 · ${unit.name} · <span class="lesson-no">${lesson.no}</span></div>
      <h3 class="card-title">${lesson.title}</h3>
      <p class="card-oneliner">${lesson.objective}</p>
      <div class="card-tags">${lesson.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="card-foot">
        <span>적용한 선생님 ${lesson.appliedCount}명</span>
        <span>${lesson.visibility}</span>
      </div>
    </a>
  `;
}
