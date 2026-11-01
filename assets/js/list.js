document.addEventListener("DOMContentLoaded", () => {
  renderHeaderFooter("list");

  const gradeSel = document.getElementById("filterGrade");
  const subjectSel = document.getElementById("filterSubject");
  const semesterSel = document.getElementById("filterSemester");
  const searchInput = document.getElementById("filterSearch");
  const resetBtn = document.getElementById("filterReset");
  const grid = document.getElementById("listGrid");
  const count = document.getElementById("listCount");

  const subjects = [...new Set(UNITS.map((u) => u.subject))];
  subjectSel.innerHTML =
    '<option value="">과목 전체</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");

  const grades = [...new Set(UNITS.map((u) => u.grade))].sort();
  gradeSel.innerHTML =
    '<option value="">학년 전체</option>' +
    grades.map((g) => `<option value="${g}">${g}학년</option>`).join("");

  function render() {
    const grade = gradeSel.value;
    const subject = subjectSel.value;
    const semester = semesterSel.value;
    const keyword = searchInput.value.trim().toLowerCase();

    const visible = LESSONS.filter((l) => l.visibility === "공개").filter((l) => {
      const unit = getUnit(l.unitId);
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
      grid.innerHTML = visible.map(lessonCardHTML).join("");
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
