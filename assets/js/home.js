import { renderHeaderFooter, subjectClass, lessonCardHTML } from "./main.js";
import { fetchUnits, fetchLessons, findUnit } from "./store.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderHeaderFooter("home");

  const [units, lessons] = await Promise.all([fetchUnits(), fetchLessons()]);
  const published = lessons.filter((l) => l.visibility === "공개");

  const featured = published[0] || lessons[0];
  if (!featured) return;

  const featuredUnit = findUnit(units, featured.unitId);
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

  const recent = published.slice(0, 3);
  document.getElementById("recentGrid").innerHTML = recent
    .map((l) => lessonCardHTML(l, findUnit(units, l.unitId)))
    .join("");
});
