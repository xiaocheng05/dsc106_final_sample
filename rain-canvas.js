const canvas = document.getElementById("rainCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particles = [];
const count = 220;
class Particle {
  constructor() { this.reset(true); }
  reset(randomY = false) {
    this.x = Math.random() * canvas.width;
    this.y = randomY ? Math.random() * canvas.height : -20;
    this.r = Math.random() * 2.2 + 0.6;
    this.speed = Math.random() * 0.7 + 0.25;
    this.drift = Math.random() * 0.8 - 0.4;
    this.opacity = Math.random() * 0.32 + 0.12;
  }
  move() {
    this.y += this.speed;
    this.x += this.drift + Math.sin(this.y * 0.01) * 0.25;
    if (this.y > canvas.height + 20 || this.x < -30 || this.x > canvas.width + 30) this.reset(false);
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(235, 245, 255, ${this.opacity})`;
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
