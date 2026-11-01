document.addEventListener("DOMContentLoaded", () => {
  renderHeaderFooter("home");

  const featured = LESSONS.find((l) => l.visibility === "공개") || LESSONS[0];
  const featuredUnit = getUnit(featured.unitId);
  const heroCard = document.getElementById("heroCard");
  heroCard.innerHTML = `
    <a class="index-card" href="lesson.html?id=${featured.id}">
      <span class="card-tab ${subjectClass(featuredUnit.subject)}">${featuredUnit.subject}</span>
      <div class="card-meta">${featuredUnit.grade}학년 ${featuredUnit.semester}학기 · ${featuredUnit.name} · <span class="lesson-no">${featured.no}</span></div>
      <h3 class="card-title">${featured.title}</h3>
      <p class="card-oneliner">${featured.objective}</p>
      <div class="card-tags">${featured.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="card-foot">
        <span>적용한 선생님 ${featured.appliedCount}명</span>
        <span>과정안 전체 보기 →</span>
      </div>
    </a>
  `;

  const recent = LESSONS.filter((l) => l.visibility === "공개").slice(0, 3);
  document.getElementById("recentGrid").innerHTML = recent.map(lessonCardHTML).join("");
});
