import { renderHeaderFooter, lessonCardHTML } from "./main.js";
import { fetchUnits, fetchLessons, findUnit } from "./store.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderHeaderFooter("list");

  const [units, lessons] = await Promise.all([fetchUnits(), fetchLessons()]);
  const published = lessons.filter((l) => l.visibility === "공개");

  const gradeSel = document.getElementById("filterGrade");
  const subjectSel = document.getElementById("filterSubject");
  const semesterSel = document.getElementById("filterSemester");
  const searchInput = document.getElementById("filterSearch");
  const resetBtn = document.getElementById("filterReset");
  const grid = document.getElementById("listGrid");
  const count = document.getElementById("listCount");

  const subjects = [...new Set(units.map((u) => u.subject))];
  subjectSel.innerHTML =
    '<option value="">과목 전체</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");

  const grades = [...new Set(units.map((u) => u.grade))].sort((a, b) => a - b);
  gradeSel.innerHTML =
    '<option value="">학년 전체</option>' +
    grades.map((g) => `<option value="${g}">${g}학년</option>`).join("");

  function render() {
    const grade = gradeSel.value;
    const subject = subjectSel.value;
    const semester = semesterSel.value;
    const keyword = searchInput.value.trim().toLowerCase();

    const visible = published.filter((l) => {
      const unit = findUnit(units, l.unitId);
      if (grade && String(unit.grade) !== grade) return false;
      if (subject && unit.subject !== subject) return false;
      if (semester && String(unit.semester) !== semester) return false;
      if (keyword) {
        const haystack = [unit.name, l.title, ...l.standards.map((s) => s.code)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });

    count.textContent = `${visible.length}개 차시`;

    if (visible.length === 0) {
      grid.innerHTML = "";
      grid.insertAdjacentHTML(
        "afterend",
        '<p class="empty-state" id="emptyState">조건에 맞는 차시가 없습니다. 필터를 바꿔 보세요.</p>'
      );
    } else {
      const old = document.getElementById("emptyState");
      if (old) old.remove();
      grid.innerHTML = visible.map((l) => lessonCardHTML(l, findUnit(units, l.unitId))).join("");
    }
  }

  [gradeSel, subjectSel, semesterSel].forEach((el) => el.addEventListener("change", render));
  searchInput.addEventListener("input", render);
  resetBtn.addEventListener("click", () => {
    gradeSel.value = "";
    subjectSel.value = "";
    semesterSel.value = "";
    searchInput.value = "";
    render();
  });

  render();
});
