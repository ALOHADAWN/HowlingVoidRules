// ===== Timecode =====
function pad(n) {
  return String(n).padStart(2, "0");
}
let start = Date.now();
function tick() {
  const t = Math.floor((Date.now() - start) / 1000);
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  const el = document.getElementById("timecode");
  if (el) el.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
setInterval(tick, 250);
tick();

// ===== Segment switching =====
const navItems = Array.from(
  document.querySelectorAll(".nav__item[data-target]"),
);
const segments = Array.from(document.querySelectorAll(".segment"));

function setActive(id) {
  segments.forEach((s) => s.classList.toggle("is-active", s.id === id));
  navItems.forEach((b) => {
    const active = b.dataset.target === id;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
    const mark = b.querySelector(".nav__mark");
    if (mark) mark.textContent = active ? "▶" : "▶";
  });

  // scroll content top when switching
  const paper = document.querySelector(".paper");
  if (paper) paper.scrollTop = 0;
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => setActive(btn.dataset.target));
});
