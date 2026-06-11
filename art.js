const canvas = document.getElementById("artCanvas");
const ctx = canvas.getContext("2d");

const clearBtn = document.getElementById("clear-btn");
const resetBtn = document.getElementById("reset-btn");

let particlesArray = [];
const NUMBER_OF_PARTICLES = 85;
const MAX_DISTANCE = 90; // Proximity threshold for drawing line matrices

// Track pointer vector coordinates
let mouse = {
    x: null,
    y: null,
    radius: 120, // Radius of mouse field influence
    repel: true  // Push particles away by default
};

// Set canvas sizing bounds to match CSS layout container
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();

// Handle tracking listeners
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
});

// Mobile/Tablet touch integration support
canvas.addEventListener("touchmove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
});

canvas.addEventListener("touchend", () => {
    mouse.x = null;
    mouse.y = null;
});

clearBtn.addEventListener("click", () => {
    mouse.repel = !mouse.repel;
    clearBtn.innerText = mouse.repel ? "Invert Charge" : "Attract Mode";
    clearBtn.style.backgroundColor = mouse.repel ? "var(--accent-blue)" : "var(--accent-orange)";
});

resetBtn.addEventListener("click", initParticleMatrix);

// Particle Blueprint Object Constructor Blueprint
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Fractional velocity tracking multipliers
        this.vx = (Math.random() * 1.6) - 0.8;
        this.vy = (Math.random() * 1.6) - 0.8;
        this.baseSize = Math.random() * 2 + 2;
        this.size = this.baseSize;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "#2563eb"; // Clean accent-blue fill
        ctx.fill();
    }

    update() {
        // Wall boundaries checking loops
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

        // Mouse Interactivity Field Mechanics
        if (mouse.x !== null && mouse.y !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius) {
                // Compute vector force ratios
                let force = (mouse.radius - distance) / mouse.radius;
                let forceX = (dx / distance) * force * 3;
                let forceY = (dy / distance) * force * 3;

                if (mouse.repel) {
                    // Push vector nodes away from pointer
                    this.x -= forceX;
                    this.y -= forceY;
                } else {
                    // Pull vector nodes toward pointer coordinate
                    this.x += forceX;
                    this.y += forceY;
                }
                this.size = this.baseSize * 1.8; // Grow nodes when interacting
            } else {
                this.size = this.baseSize;
            }
        } else {
            this.size = this.baseSize;
        }

        // Apply background drift velocity updates
        this.x += this.vx;
        this.y += this.vy;
    }
}

function initParticleMatrix() {
    particlesArray = [];
    for (let i = 0; i < NUMBER_OF_PARTICLES; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
    }
}

// Nested Loop Framework to calculate matrix line connections
function drawNetworkLines() {
    for (let i = 0; i < particlesArray.length; i++) {
        for (let j = i + 1; j < particlesArray.length; j++) {
            let dx = particlesArray[i].x - particlesArray[j].x;
            let dy = particlesArray[i].y - particlesArray[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < MAX_DISTANCE) {
                // Fade lines opacity smoothly based on distance proximity metric
                let opacity = 1 - (distance / MAX_DISTANCE);
                ctx.strokeStyle = `rgba(100, 116, 139, ${opacity * 0.25})`; // Slate muted line stroke
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
            }
        }
    }
}

// 60FPS Refresh Clock Render Frame Execution Engine Loop
function animateEngine() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let particle of particlesArray) {
        particle.update();
        particle.draw();
    }
    
    drawNetworkLines();
    requestAnimationFrame(animateEngine);
}

// Handle window screen dimension changes dynamically
window.addEventListener("resize", () => {
    resizeCanvas();
    initParticleMatrix();
});

// Initialize Framework Loop
initParticleMatrix();
animateEngine();