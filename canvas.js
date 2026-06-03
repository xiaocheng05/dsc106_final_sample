const canvas = document.getElementById("rainCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particles = [];
const count = 200;

const warmColors = [
  [255, 100, 40],
  [255, 160, 30],
  [255, 60,  20],
  [255, 200, 50],
  [220, 50,  30],
];

class Particle {
  constructor() { this.reset(true); }
  reset(randomY = false) {
    this.x       = Math.random() * canvas.width;
    this.y       = randomY ? Math.random() * canvas.height : canvas.height + 20;
    this.r       = Math.random() * 2.4 + 0.7;
    this.speed   = Math.random() * 0.75 + 0.28;
    this.drift   = Math.random() * 0.6 - 0.3;
    this.opacity = Math.random() * 0.28 + 0.09;
    this.color   = warmColors[Math.floor(Math.random() * warmColors.length)];
    this.phase   = Math.random() * Math.PI * 2;
  }
  move() {
    this.y -= this.speed;
    this.x += this.drift + Math.sin(this.y * 0.015 + this.phase) * 0.4;
    if (this.y < -20 || this.x < -30 || this.x > canvas.width + 30) this.reset(false);
  }
  draw() {
    const [r, g, b] = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${this.opacity})`;
    ctx.fill();
  }
}

function init() { particles = []; for (let i = 0; i < count; i++) particles.push(new Particle()); }
function visible() {
  const title = document.querySelector(".title-slide");
  canvas.style.display = title && title.classList.contains("active") ? "block" : "none";
}
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.style.display !== "none") particles.forEach((p) => { p.move(); p.draw(); });
  requestAnimationFrame(animate);
}
const observer = new MutationObserver(visible);
document.querySelectorAll(".slide").forEach((slide) => observer.observe(slide, { attributes: true, attributeFilter: ["class"] }));
window.addEventListener("resize", () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); });
init(); visible(); animate();