/**
 * Pac-Man Educational Game Engine v2
 * Fixed: ghost wall collision, pacman movement, trivia life penalty
 */

// =============================================================
// AUDIO (Web Audio API — lightweight sound effects)
// =============================================================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function playTone(freq, type, dur, vol = 0.12) {
    try {
        const a = getAudioCtx();
        const o = a.createOscillator();
        const g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
        o.start(a.currentTime); o.stop(a.currentTime + dur);
    } catch (e) { }
}
function sfxDot() { playTone(440, 'square', 0.06); }
function sfxCherry() { playTone(880, 'sine', 0.25); setTimeout(() => playTone(1100, 'sine', 0.25), 80); }
function sfxCorrect() { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.18, 0.1), i * 100)); }
function sfxWrong() { playTone(150, 'sawtooth', 0.35, 0.1); }
function sfxDeath() { [300, 200, 100].forEach((f, i) => setTimeout(() => playTone(f, 'sawtooth', 0.18), i * 120)); }

// =============================================================
// GLOBALS
// =============================================================
const canvas = document.getElementById('gameCanvas');
const drawCtx = canvas.getContext('2d');          // renamed to avoid shadowing
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const topicLabel = document.querySelector('#topic-label span');

const TILE = 20;                                 // tile size in px
const COLS = 28;
const ROWS = 31;
canvas.width = COLS * TILE;                      // 560
canvas.height = ROWS * TILE;                      // 620

let score = 0;
let lives = 3;
let gameState = 'SPLASH';   // SPLASH, MENU, PLAYING, TRIVIA, GAMEOVER
let currentTopic = '';
let currentTriviaIndex = 0;
let currentTriviaData = null;                    // currently active trivia item
let animationId;

// =============================================================
// LEVEL SYSTEM & MAPS
// =============================================================
let currentLevel = 1;
const MAX_LEVELS = 20;

// Base left halves for different maze designs
// 1=Wall, 0=Dot, 2=Empty
const mapHalves = [
    // Base 1 (Classic with Super Pellets)
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 7, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 6],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 1, 2, 5, 5],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 7, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 4],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    // Base 2 (Different wall segments)
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 7, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1, 1, 1, 6],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 1, 2, 5, 5],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 7, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 4],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    // Base 3 (More open)
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 7, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 2, 2, 2, 1, 0, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 2, 1, 2, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 2, 1, 2, 1, 0, 1, 1, 2, 1, 1, 1, 6],
        [1, 1, 2, 1, 2, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [2, 2, 2, 1, 2, 2, 0, 2, 2, 2, 1, 2, 5, 5],
        [1, 1, 2, 1, 1, 1, 0, 1, 1, 2, 1, 2, 2, 2],
        [1, 1, 2, 2, 2, 2, 0, 1, 1, 2, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 2, 2, 2, 2],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 7, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 4],
        [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
];

function generateLevelMap(levelIndex) {
    const halfBase = mapHalves[levelIndex % mapHalves.length];
    const fullMap = [];
    halfBase.forEach(row => {
        const leftHalf = [...row];
        const rightHalf = [...row].reverse();
        // Right half correction (Spawn pointers 4 and 5 become 2 on right side to avoid double spawn)
        for (let i = 0; i < rightHalf.length; i++) {
            if (rightHalf[i] === 4 || rightHalf[i] === 5) rightHalf[i] = 2; // Keep spawn only on Left
        }
        fullMap.push(leftHalf.concat(rightHalf));
    });
    return fullMap;
}

const levelColors = [
    '#1a2744', '#1a4427', '#441a27', '#443c1a', '#2d1a44',
    '#1a3d44', '#441a1a', '#24441a', '#3f1a44', '#442d1a'
];
let map = [];
const PACMAN_SPAWN = { x: 13, y: 23 };

// =============================================================
// HELPER — is a tile walkable? (anything that is NOT a wall)
// =============================================================
function isWalkable(col, row, isGhost = false) {
    if (row === 14 && (col < 0 || col >= COLS)) return true; // Wraparound tunnel
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    
    const tile = map[row][col];
    if (tile === 1) return false;
    if (tile === 6 && !isGhost) return false; // Only ghosts can pass the pen door
    
    return true;
}

// =============================================================
// ENTITY BASE
// =============================================================
class Entity {
    constructor(col, row, color) {
        this.x = col * TILE;
        this.y = row * TILE;
        this.radius = TILE / 2 - 2;
        this.color = color;
        this.speed = 1;
        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
    }

    // Current tile (center of entity)
    getTile() {
        return {
            x: Math.floor((this.x + TILE / 2) / TILE),
            y: Math.floor((this.y + TILE / 2) / TILE)
        };
    }

    // Is entity aligned to tile grid?
    isAligned() {
        return this.x % TILE === 0 && this.y % TILE === 0;
    }

    // Can move one step in direction (dx,dy)?
    canMoveDir(dx, dy) {
        if (dx === 0 && dy === 0) return true;
        const nx = this.x + dx * this.speed;
        const ny = this.y + dy * this.speed;
        const m = 0.1; // margin
        // Check all four corners of the bounding box
        const corners = [
            { x: nx + m, y: ny + m },
            { x: nx + TILE - m, y: ny + m },
            { x: nx + m, y: ny + TILE - m },
            { x: nx + TILE - m, y: ny + TILE - m }
        ];
        return corners.every(c => {
            const col = Math.floor(c.x / TILE);
            const row = Math.floor(c.y / TILE);
            return isWalkable(col, row, this instanceof Ghost);
        });
    }

    move() {
        // At grid-aligned positions, try switching to queued direction
        if (this.isAligned()) {
            if (this.canMoveDir(this.nextDir.x, this.nextDir.y)) {
                this.dir = { ...this.nextDir };
            }
        }
        // Move in current direction if possible
        if (this.canMoveDir(this.dir.x, this.dir.y)) {
            this.x += this.dir.x * this.speed;
            this.y += this.dir.y * this.speed;
        }
        
        // Wraparound at the tunnels
        if (this.x < -TILE) this.x = COLS * TILE;
        else if (this.x > COLS * TILE) this.x = -TILE;
    }
}

// =============================================================
// PAC-MAN
// =============================================================
class Player extends Entity {
    constructor(col, row) {
        super(col, row, '#f1c40f');
        this.mouthAngle = 0;
        this.mouthDir = 1;        // 1 = opening, -1 = closing
        this.growthScale = 1;
    }

    update() {
        this.move();
        if (this.growthScale > 1) {
            this.growthScale -= 0.05;
            if (this.growthScale < 1) this.growthScale = 1;
        }
    }

    draw() {
        // Smooth mouth animation
        this.mouthAngle += 0.025 * this.mouthDir;
        if (this.mouthAngle > 0.25) this.mouthDir = -1;
        if (this.mouthAngle < 0.01) this.mouthDir = 1;

        let rotation = 0;
        if (this.dir.x === 1) rotation = 0;
        else if (this.dir.x === -1) rotation = Math.PI;
        else if (this.dir.y === 1) rotation = Math.PI / 2;
        else if (this.dir.y === -1) rotation = -Math.PI / 2;

        const cx = this.x + TILE / 2;
        const cy = this.y + TILE / 2;

        drawCtx.fillStyle = this.color;
        drawCtx.beginPath();
        drawCtx.arc(cx, cy, this.radius * this.growthScale,
            rotation + this.mouthAngle * Math.PI,
            rotation + (2 - this.mouthAngle) * Math.PI);
        drawCtx.lineTo(cx, cy);
        drawCtx.fill();
    }
}

// =============================================================
// GHOST — movement uses canMoveDir so they respect walls
// =============================================================
class Ghost extends Entity {
    constructor(col, row, color) {
        super(col, row, color);
        this.dir = { x: 0, y: -1 };  // start moving up to exit pen
        this.nextDir = { ...this.dir };
        this.baseColor = color;
        this.state = 'NORMAL'; // NORMAL, SCARED, EYES, RESPAWNING
        this.scaredTimer = 0;
        this.respawnTimer = 0;
        this.baseSpeed = 1;
    }

    update() {
        if (this.state === 'RESPAWNING') {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.state = 'NORMAL';
                this.speed = this.baseSpeed;
                this.dir = { x: 0, y: -1 }; // exit pen
            }
            return;
        }

        let skipMove = false;
        if (this.state === 'SCARED') {
            this.scaredTimer--;
            if (this.scaredTimer <= 0) {
                this.state = 'NORMAL';
                this.speed = this.baseSpeed;
            } else if (this.scaredTimer % 2 === 0) {
                skipMove = true;
            }
        }

        if (this.state === 'EYES') {
            this.speed = 3;
            // Move directly to spawn (13.5, 14) roughly
            const targetX = 13.5 * TILE;
            const targetY = 14 * TILE;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                this.state = 'RESPAWNING';
                this.respawnTimer = 60; // 1 second approx
                this.x = 13.5 * TILE - TILE / 2;
                this.y = 14 * TILE;
            } else {
                this.dir = { x: dx / dist, y: dy / dist };
                this.x += this.dir.x * this.speed;
                this.y += this.dir.y * this.speed;
            }
            return; // ignore walls
        }

        if (skipMove) return;

        // Only pick a new direction when aligned to grid
        if (this.isAligned()) {
            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            // Filter: can move there AND not reverse (unless dead-end)
            const possible = dirs.filter(d =>
                this.canMoveDir(d.x, d.y) &&
                !(d.x === -this.dir.x && d.y === -this.dir.y)
            );

            if (possible.length > 0) {
                this.dir = possible[Math.floor(Math.random() * possible.length)];
            } else {
                // Dead-end: reverse
                const rev = { x: -this.dir.x, y: -this.dir.y };
                if (this.canMoveDir(rev.x, rev.y)) {
                    this.dir = rev;
                }
            }
            this.nextDir = { ...this.dir };
        }

        // *** FIX: only move if direction is walkable ***
        if (this.canMoveDir(this.dir.x, this.dir.y)) {
            this.x += this.dir.x * this.speed;
            this.y += this.dir.y * this.speed;
        }
        
        // Wraparound
        if (this.x < -TILE) this.x = COLS * TILE;
        else if (this.x > COLS * TILE) this.x = -TILE;
    }

    draw() {
        const cx = this.x + TILE / 2;
        const cy = this.y + TILE / 2;

        if (this.state === 'EYES') {
            // Draw only eyes
            drawCtx.fillStyle = '#fff';
            drawCtx.beginPath();
            drawCtx.arc(cx - 4, cy - 4, 3, 0, Math.PI * 2);
            drawCtx.arc(cx + 4, cy - 4, 3, 0, Math.PI * 2);
            drawCtx.fill();
            drawCtx.fillStyle = '#222';
            drawCtx.beginPath();
            drawCtx.arc(cx - 4 + this.dir.x * 1.5, cy - 4 + this.dir.y * 1.5, 1.5, 0, Math.PI * 2);
            drawCtx.arc(cx + 4 + this.dir.x * 1.5, cy - 4 + this.dir.y * 1.5, 1.5, 0, Math.PI * 2);
            drawCtx.fill();
            return;
        }

        // Determine Body Color
        let bodyColor = this.baseColor;
        if (this.state === 'SCARED') {
            if (this.scaredTimer < 120 && Math.floor(Date.now() / 200) % 2 === 0) {
                bodyColor = '#fff'; // flashing white
            } else {
                bodyColor = '#0000ff'; // blue
            }
        }

        // Body
        if (this.state === 'RESPAWNING') {
            drawCtx.globalAlpha = 0.5; // blinking alpha or simply transparent
            if (Math.floor(Date.now() / 150) % 2 === 0) return; // flicker
            drawCtx.globalAlpha = 1.0;
        }

        drawCtx.fillStyle = bodyColor;
        drawCtx.beginPath();
        drawCtx.arc(cx, cy - 2, this.radius, Math.PI, 0);

        // 4 classic tentacles
        const pY = cy + this.radius;
        const pYUp = cy + this.radius - 3;
        const r = this.radius;
        const frame = Math.floor(Date.now() / 200) % 2;

        if (frame === 0) {
            drawCtx.lineTo(cx + r, pY);
            drawCtx.lineTo(cx + r * 0.5, pYUp);
            drawCtx.lineTo(cx, pY);
            drawCtx.lineTo(cx - r * 0.5, pYUp);
            drawCtx.lineTo(cx - r, pY);
        } else {
            drawCtx.lineTo(cx + r, pY - 2); 
            drawCtx.lineTo(cx + r * 0.75, pY);
            drawCtx.lineTo(cx + r * 0.25, pYUp);
            drawCtx.lineTo(cx - r * 0.25, pY);
            drawCtx.lineTo(cx - r * 0.75, pYUp);
            drawCtx.lineTo(cx - r, pY - 2);
        }
        drawCtx.fill();

        // Eyes
        drawCtx.fillStyle = (this.state === 'SCARED') ? '#ffcccc' : '#fff';
        drawCtx.beginPath();
        drawCtx.arc(cx - 4, cy - 4, 3, 0, Math.PI * 2);
        drawCtx.arc(cx + 4, cy - 4, 3, 0, Math.PI * 2);
        drawCtx.fill();
        // Pupils
        drawCtx.fillStyle = (this.state === 'SCARED') ? '#ff0000' : '#222';
        drawCtx.beginPath();
        drawCtx.arc(cx - 4 + this.dir.x * 1.5, cy - 4 + this.dir.y * 1.5, 1.5, 0, Math.PI * 2);
        drawCtx.arc(cx + 4 + this.dir.x * 1.5, cy - 4 + this.dir.y * 1.5, 1.5, 0, Math.PI * 2);
        drawCtx.fill();
        
        drawCtx.globalAlpha = 1.0;
    }
}

// =============================================================
// GAME STATE
// =============================================================
let pacman;
let ghosts = [];

function initGame() {
    map = generateLevelMap(currentLevel - 1);
    
    // Check if score persists or resets:
    // we keep score across levels, but reset lives correctly.
    if(gameState === 'GAMEOVER' || gameState === 'MENU') {
        score = 0;
        lives = 3;
    }
    
    currentTriviaIndex = 0;
    currentTriviaData = null;
    ghosts = [];
    pacman = null;

    const ghostColors = ['#e74c3c', '#3498db', '#9b59b6', '#e67e22'];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 4) {
                pacman = new Player(c, r);
                map[r][c] = 2; // clear spawn tile
            } else if (map[r][c] === 5) {
                map[r][c] = 2; // clear spawn tile, do not spawn ghost here
            }
        }
    }
    const ghostSpawns = [{ x: 12, y: 14 }, { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }];
    for (let i = 0; i < 4; i++) {
        ghosts.push(new Ghost(ghostSpawns[i].x, ghostSpawns[i].y, ghostColors[i]));
    }
    if (!pacman) pacman = new Player(PACMAN_SPAWN.x, PACMAN_SPAWN.y);
    
    spawnRandomCherries();
    
    updateHUD();
}

function spawnRandomCherries() {
    let emptySpots = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 0) emptySpots.push({ r, c });
        }
    }
    
    // Shuffle and pick 3
    for(let i = emptySpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
    }
    
    for(let i=0; i<3 && i<emptySpots.length; i++) {
        const spot = emptySpots[i];
        map[spot.r][spot.c] = 3;
    }
}

// =============================================================
// SCREEN NAVIGATION
// =============================================================
function showTopicMenu() {
    document.getElementById('splash-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    gameState = 'MENU';
}

function showLevels(topic) {
    currentTopic = topic;
    const labels = { programming: 'Programación', economy: 'Economía', agronomy: 'Agronomía', oop: 'POO' };
    document.getElementById('lvl-topic-display').innerText = labels[topic] || topic;
    document.getElementById('menu-overlay').classList.add('hidden');
    
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    
    // Generate 20 buttons based on local storage progress
    const unlocked = parseInt(localStorage.getItem(`pacman_${topic}_level`) || '1', 10);
    
    for (let i = 1; i <= MAX_LEVELS; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn ' + (i > unlocked ? 'locked' : '');
        btn.innerText = i;
        btn.disabled = (i > unlocked);
        
        btn.onclick = () => startGame(i, labels[topic] || topic);
        grid.appendChild(btn);
    }
    
    document.getElementById('level-overlay').classList.remove('hidden');
}

function backToTopics() {
    document.getElementById('level-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
}

let currentTopicLabel = '';

function startGame(level, topicLabelText) {
    currentLevel = level;
    currentTopicLabel = topicLabelText;
    document.getElementById('level-overlay').classList.add('hidden');
    initGame();
    gameState = 'PLAYING';
    gameLoop();
}

function updateHUD() {
    document.getElementById('score').innerText = score;
    document.getElementById('topic-label').innerHTML = `NIVEL ${currentLevel} | TEMA:<br><span>${currentTopicLabel}</span>`;
    document.getElementById('lives').innerText = lives;
}

// =============================================================
// RENDERING
// =============================================================
function drawMap() {
    const wallColor = levelColors[(currentLevel - 1) % levelColors.length];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = map[r][c];
            const px = c * TILE;
            const py = r * TILE;
            if (t === 1) {
                drawCtx.fillStyle = wallColor; 
                drawCtx.fillRect(px, py, TILE, TILE);
                drawCtx.strokeStyle = '#2a4070';
                drawCtx.lineWidth = 0.5;
                drawCtx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
            } else if (t === 6) {
                // Ghost pen door
                drawCtx.fillStyle = '#ffb8ae'; 
                drawCtx.fillRect(px, py + TILE/2 - 2, TILE, 4);
            } else if (t === 0) {
                drawCtx.fillStyle = '#ecf0f1';
                drawCtx.beginPath();
                drawCtx.arc(px + TILE / 2, py + TILE / 2, 2, 0, Math.PI * 2);
                drawCtx.fill();
            } else if (t === 7) {
                // Super Pellet
                if (Math.floor(Date.now() / 250) % 2 === 0) {
                    drawCtx.fillStyle = '#ffb8ae';
                    drawCtx.beginPath();
                    drawCtx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
                    drawCtx.fill();
                }
            } else if (t === 3) {
                // Cherry
                drawCtx.fillStyle = '#e74c3c';
                drawCtx.beginPath();
                drawCtx.arc(px + TILE / 2 - 3, py + TILE / 2 + 2, 4.5, 0, Math.PI * 2);
                drawCtx.arc(px + TILE / 2 + 3, py + TILE / 2 - 1, 4.5, 0, Math.PI * 2);
                drawCtx.fill();
                drawCtx.strokeStyle = '#27ae60';
                drawCtx.lineWidth = 1.5;
                drawCtx.beginPath();
                drawCtx.moveTo(px + TILE / 2, py + TILE / 2 - 4);
                drawCtx.quadraticCurveTo(px + TILE / 2 + 4, py + TILE / 2 - 12, px + TILE / 2 + 6, py + TILE / 2 - 9);
                drawCtx.stroke();
            }
        }
    }
}

// =============================================================
// COLLISIONS
// =============================================================
function checkCollisions() {
    const t = pacman.getTile();

    // Eat dot
    if (map[t.y] && map[t.y][t.x] === 0) {
        map[t.y][t.x] = 2;
        score += 10;
        sfxDot();
        updateHUD();
    }

    // Eat Super Pellet
    if (map[t.y] && map[t.y][t.x] === 7) {
        map[t.y][t.x] = 2;
        score += 50;
        pacman.growthScale = 1.5; // grow animation
        sfxCherry(); // reuse cherry sfx for now
        ghosts.forEach(g => {
            if (g.state !== 'EYES' && g.state !== 'RESPAWNING') {
                g.state = 'SCARED';
                g.scaredTimer = 450; // about 7.5 seconds (at 60fps)
                g.speed = 1; // force 1 to prevent paralysis bug
                // reverse direction
                g.dir = { x: -g.dir.x, y: -g.dir.y };
                g.nextDir = { ...g.dir };
            }
        });
        updateHUD();
    }

    // Eat cherry → trivia
    if (map[t.y] && map[t.y][t.x] === 3) {
        map[t.y][t.x] = 2;
        sfxCherry();
        triggerTrivia();
        return; // stop checking
    }

    // Ghost collision
    for (const ghost of ghosts) {
        const dx = pacman.x - ghost.x;
        const dy = pacman.y - ghost.y;
        if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.7) {
            if (ghost.state === 'SCARED') {
                // Eat ghost
                ghost.state = 'EYES';
                score += 200;
                sfxDot(); // maybe a chomp
                updateHUD();
            } else if (ghost.state === 'NORMAL') {
                handleGhostDeath();
                return;
            }
        }
    }
}

function handleGhostDeath() {
    lives--;
    sfxDeath();
    updateHUD();
    if (lives <= 0) {
        endGame('¡Derrota!');
    } else {
        resetPositions();
    }
}

function resetPositions() {
    pacman.x = PACMAN_SPAWN.x * TILE;
    pacman.y = PACMAN_SPAWN.y * TILE;
    pacman.dir = { x: 0, y: 0 };
    pacman.nextDir = { x: 0, y: 0 };
    const ghostSpawns = [{ x: 12, y: 14 }, { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }];
    ghosts.forEach((g, i) => {
        const sp = ghostSpawns[i % ghostSpawns.length];
        g.x = sp.x * TILE;
        g.y = sp.y * TILE;
        g.dir = { x: 0, y: -1 };
        g.nextDir = { x: 0, y: -1 };
    });
}

// =============================================================
// TRIVIA SYSTEM
// =============================================================
function triggerTrivia() {
    gameState = 'TRIVIA';
    cancelAnimationFrame(animationId);
    const pool = window.triviaData[currentTopic];
    const randomIndex = Math.floor(Math.random() * pool.length);
    currentTriviaData = pool[randomIndex];

    document.getElementById('fact-title').innerText = currentTriviaData.title;
    document.getElementById('fact-text').innerText = currentTriviaData.fact;
    document.getElementById('fact-modal').classList.remove('hidden');
}

function showTrivia() {
    document.getElementById('fact-modal').classList.add('hidden');
    document.getElementById('trivia-modal').classList.remove('hidden');
    document.getElementById('trivia-feedback').classList.add('hidden');

    const data = currentTriviaData;
    document.getElementById('question-text').innerText = data.question;
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    data.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, data.correctIndex);
        container.appendChild(btn);
    });
}

function checkAnswer(selected, correct) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);
    const feedbackEl = document.getElementById('trivia-feedback');

    if (selected === correct) {
        // ✅ Correct
        btns[selected].classList.add('correct');
        sfxCorrect();
        score += 100;
        updateHUD();
        feedbackEl.innerText = '¡Correcto! +100 puntos';
        feedbackEl.className = 'trivia-feedback correct-fb';
        feedbackEl.classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('trivia-modal').classList.add('hidden');
            currentTriviaIndex++;
            gameState = 'PLAYING';
            gameLoop();
        }, 1500);
    } else {
        // ❌ Wrong — lose a life
        btns[selected].classList.add('wrong');
        btns[correct].classList.add('correct');
        sfxWrong();
        lives--;
        updateHUD();

        if (lives <= 0) {
            feedbackEl.innerText = '¡Incorrecto! Sin vidas...';
            feedbackEl.className = 'trivia-feedback wrong-fb';
            feedbackEl.classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('trivia-modal').classList.add('hidden');
                endGame('¡Derrota!');
            }, 1500);
        } else {
            feedbackEl.innerHTML = `¡Incorrecto! -1 vida (quedan ${lives}). <button onclick="retryTrivia()" class="retry-btn" style="margin-top: 10px; padding: 5px 12px; font-size: 0.9rem; background: var(--neon-red); color: white; border: none; border-radius: 5px; cursor: pointer;">Reintentar</button>`;
            feedbackEl.className = 'trivia-feedback wrong-fb';
            feedbackEl.classList.remove('hidden');
        }
    }
}

function resetTriviaUI() {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => {
        b.disabled = false;
        b.classList.remove('correct', 'wrong');
    });
    document.getElementById('trivia-feedback').classList.add('hidden');
}

window.retryTrivia = function() {
    resetTriviaUI();
    document.getElementById('trivia-modal').classList.add('hidden');
    
    // Pick another random question from the pool
    const pool = window.triviaData[currentTopic];
    const randomIndex = Math.floor(Math.random() * pool.length);
    currentTriviaData = pool[randomIndex];

    document.getElementById('fact-title').innerText = currentTriviaData.title;
    document.getElementById('fact-text').innerText = currentTriviaData.fact;
    
    document.getElementById('fact-modal').classList.remove('hidden');
};

function goBackToFact() {
    document.getElementById('trivia-modal').classList.add('hidden');
    document.getElementById('fact-modal').classList.remove('hidden');
}

function endGame(title) {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    document.getElementById('end-title').innerText = title;
    document.getElementById('end-score').innerText = `Puntaje Total: ${score}`;
    
    const endBtn = document.querySelector('#end-overlay button');
    
    // Default fail state behaviour
    if(title === '¡Derrota!') {
        endBtn.innerText = 'Volver al Menú Niveles';
        endBtn.onclick = () => {
            document.getElementById('end-overlay').classList.add('hidden');
            showLevels(currentTopic);
        };
    }
    
    document.getElementById('end-overlay').classList.remove('hidden');
}

// =============================================================
// GAME LOOP
// =============================================================
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    drawCtx.clearRect(0, 0, canvas.width, canvas.height);

    drawMap();
    pacman.update();
    pacman.draw();

    ghosts.forEach(g => { g.update(); g.draw(); });

    checkCollisions();

    // Win condition — no dots left
    if (!map.some(row => row.includes(0))) {
        completeLevel();
        return;
    }

    animationId = requestAnimationFrame(gameLoop);
}

function completeLevel() {
    gameState = 'LEVEL_CLEAR';
    cancelAnimationFrame(animationId);
    
    // Unlock next level logic
    if (currentLevel < MAX_LEVELS) {
        const stored = parseInt(localStorage.getItem(`pacman_${currentTopic}_level`) || '1', 10);
        if (currentLevel >= stored) {
            localStorage.setItem(`pacman_${currentTopic}_level`, currentLevel + 1);
        }
        endGame(`¡Nivel ${currentLevel} Superado!`);
        document.querySelector('#end-overlay button').innerText = 'Siguiente Nivel';
        document.querySelector('#end-overlay button').onclick = () => {
             document.getElementById('end-overlay').classList.add('hidden');
             startGame(currentLevel + 1, currentTopicLabel);
        };
    } else {
        endGame('¡Juego Completado!');
        document.querySelector('#end-overlay button').innerText = 'Volver al Menú';
        document.querySelector('#end-overlay button').onclick = () => {
             document.getElementById('end-overlay').classList.add('hidden');
             showTopicMenu();
        };
    }
}

// =============================================================
// INPUT — keyboard
// =============================================================
window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!pacman || gameState !== 'PLAYING') return;
    switch (e.key) {
        case 'ArrowUp': pacman.nextDir = { x: 0, y: -1 }; break;
        case 'ArrowDown': pacman.nextDir = { x: 0, y: 1 }; break;
        case 'ArrowLeft': pacman.nextDir = { x: -1, y: 0 }; break;
        case 'ArrowRight': pacman.nextDir = { x: 1, y: 0 }; break;
    }
});

// =============================================================
// INPUT — touch / continuous swipe
// =============================================================
let touchStartX = 0, touchStartY = 0;

window.addEventListener('touchstart', e => {
    if (gameState !== 'PLAYING') return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (gameState !== 'PLAYING' || !pacman) return;
    
    if (e.target === canvas) {
        e.preventDefault(); // prevent scrolling while swiping
    }

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStartX;
    const dy = currentY - touchStartY;
    
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 25) {
        if (Math.abs(dx) > Math.abs(dy)) {
            pacman.nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        } else {
            pacman.nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }
        touchStartX = currentX;
        touchStartY = currentY;
    }
}, { passive: false });
