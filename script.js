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
// ===== ARCHIVE DESYNC GLITCH =====

window.addEventListener("load", () => {
  if (Math.random() < 0.05) {
    // 5% шанс

    const glitch = document.createElement("div");
    glitch.className = "archive-glitch";
    glitch.innerText = "ARCHIVE DESYNC";

    document.body.appendChild(glitch);

    setTimeout(() => {
      glitch.remove();
    }, 600);
  }
});
document.querySelector(".archive-id").addEventListener("click", () => {
  alert(`
ARCHIVE LOG
DATE: 2362.07.17

Signal detected
Source: Unknown
`);
});
let logoClicks = 0;

const logo = document.querySelector(".nav__kicker");

if (logo) {
  logo.addEventListener("click", () => {
    logoClicks++;

    if (logoClicks === 7) {
      const msg = document.createElement("div");
      msg.className = "void-message";
      msg.innerText = "You feel something watching from maintenance.";

      document.body.appendChild(msg);

      setTimeout(() => msg.remove(), 4000);

      logoClicks = 0;
    }
  });
}
setInterval(() => {
  if (Math.random() < 0.03) {
    const mark = document.createElement("div");
    mark.className = "void-symbol";
    mark.innerText = "◉";

    document.body.appendChild(mark);

    setTimeout(() => mark.remove(), 1200);
  }
}, 5000);
document.addEventListener("mouseup", () => {
  const text = window.getSelection().toString();

  if (text.includes("В бездне нам всем будет комфортно")) {
    const msg = document.createElement("div");
    msg.className = "void-message";
    msg.innerText = "SIGNAL DETECTED";

    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 2000);
  }
});
