(() => {
  const canvas = document.getElementById("vhs-bg-webgl");
  if (!canvas) return;

  const gl =
    canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });

  if (!gl) return;

  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_motion;
    varying vec2 v_uv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += valueNoise(p) * a;
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 centered = uv - 0.5;
      centered.x *= u_resolution.x / max(u_resolution.y, 1.0);

      float t = u_time * u_motion;
      float frame = floor(t * 18.0);
      float jitter = (hash(vec2(frame, 2.0)) - 0.5) * 0.008 * u_motion;
      uv.x += jitter * smoothstep(0.05, 0.9, hash(vec2(floor(uv.y * 80.0), frame)));

      float upperGlow = 1.0 - smoothstep(0.0, 0.75, length(centered - vec2(0.0, 0.28)));
      float lowerVoid = smoothstep(0.08, 0.98, length(centered + vec2(0.0, 0.56)));
      vec3 color = mix(vec3(0.004, 0.007, 0.005), vec3(0.015, 0.045, 0.024), upperGlow * 0.42);
      color *= 1.0 - lowerVoid * 0.62;

      float snow = hash(floor((uv + vec2(t * 0.015, -t * 0.02)) * u_resolution.xy * 0.72) + frame);
      snow = smoothstep(0.72, 1.0, snow);
      float softSnow = fbm(uv * vec2(135.0, 88.0) + vec2(frame * 0.17, -frame * 0.11));
      color += vec3(0.23, 0.34, 0.24) * snow * 0.18 * u_motion;
      color += vec3(0.04, 0.12, 0.055) * pow(softSnow, 2.8) * 0.36;

      float scan = sin((uv.y * u_resolution.y + t * 75.0) * 3.14159);
      color *= 0.86 + 0.14 * smoothstep(-0.15, 1.0, scan);

      float band = smoothstep(0.972, 1.0, sin(uv.y * 42.0 - t * 1.7));
      color += vec3(0.04, 0.08, 0.045) * band * 0.15;

      float drop = 1.0 - smoothstep(0.0, 0.055, abs(fract(t * 0.13 + uv.y * 0.72) - 0.5));
      color += vec3(0.14, 0.18, 0.14) * drop * 0.1 * u_motion;

      float trackingMask = 1.0 - smoothstep(0.0, 0.23, uv.y);
      float tracking = hash(vec2(floor(uv.x * u_resolution.x * 0.28), floor(t * 36.0)));
      tracking *= smoothstep(0.42, 1.0, hash(vec2(floor(uv.y * 34.0), frame + 7.0)));
      color += vec3(0.22, 0.3, 0.22) * tracking * trackingMask * 0.34 * u_motion;

      float vignette = smoothstep(0.88, 0.24, length(centered * vec2(0.78, 1.08)));
      color *= vignette;
      color = pow(color, vec3(0.92));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return;
  }

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const motionLocation = gl.getUniformLocation(program, "u_motion");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let startTime = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function render(now) {
    resize();

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, (now - startTime) / 1000);
    gl.uniform1f(motionLocation, reduceMotion.matches ? 0.0 : 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(render);
})();

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
