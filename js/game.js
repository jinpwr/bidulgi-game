
class InputHandler {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        this.touchAttack = null; // Coordinates for attack tap {x, y}

        this.setupKeyboardListeners();
        this.setupTouchListeners();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
        });
    }

    setupTouchListeners() {
        // D-pad elements
        const dUp = document.getElementById('dpad-up');
        const dDown = document.getElementById('dpad-down');
        const dLeft = document.getElementById('dpad-left');
        const dRight = document.getElementById('dpad-right');
        const gameContainer = document.getElementById('game-container');

        const handleDpad = (dir, state) => {
            this.keys[dir] = state;
        };

        // Helper to add touch events to dpad buttons
        const addDpadEvents = (el, dir) => {
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); handleDpad(dir, true); });
            el.addEventListener('touchend', (e) => { e.preventDefault(); handleDpad(dir, false); });
            // Also add mouse events for testing on PC with mouse
            el.addEventListener('mousedown', (e) => { e.preventDefault(); handleDpad(dir, true); });
            el.addEventListener('mouseup', (e) => { e.preventDefault(); handleDpad(dir, false); });
            el.addEventListener('mouseleave', (e) => { e.preventDefault(); handleDpad(dir, false); });
        };

        addDpadEvents(dUp, 'up');
        addDpadEvents(dDown, 'down');
        addDpadEvents(dLeft, 'left');
        addDpadEvents(dRight, 'right');

        // Attack Taps (on the game container/canvas, ignoring dpad)
        gameContainer.addEventListener('touchstart', (e) => {
            // If the touch target is inside the dpad, ignore it as an attack
            if (e.target.closest('#dpad-container')) return;
            
            // For now, just register the first touch as an attack attempt
            const touch = e.changedTouches[0];
            this.touchAttack = { x: touch.clientX, y: touch.clientY };
        });

        gameContainer.addEventListener('mousedown', (e) => {
             if (e.target.closest('#dpad-container')) return;
             this.touchAttack = { x: e.clientX, y: e.clientY };
        });
    }

    getAttack() {
        // Returns the attack coordinates and clears them
        const attack = this.touchAttack;
        this.touchAttack = null;
        return attack;
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = this.game.height - this.height - 100; // Start near bottom
        this.speed = 0.3; // Pixels per ms
        this.color = 'blue';
        this.hp = 100;
        this.maxHp = 100;
        this.cowHp = 0;
        this.maxCowHp = 100;
        this.isRidingCow = false;
        this.vx = 0;
        this.vy = 0;
    }

    update(deltaTime) {
        // Horizontal Movement
        if (this.game.input.keys.right) {
            this.vx = this.speed;
        } else if (this.game.input.keys.left) {
            this.vx = -this.speed;
        } else {
            this.vx = 0;
        }

        // Vertical Movement
        if (this.game.input.keys.down) {
            this.vy = this.speed;
        } else if (this.game.input.keys.up) {
            this.vy = -this.speed;
        } else {
            this.vy = 0;
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Boundaries
        // Left boundary: Player cannot go left of the starting point (0)
        if (this.x < 0) this.x = 0;
        
        // Top/Bottom boundaries
        if (this.y < 0) this.y = 0;
        if (this.y > this.game.height - this.height) this.y = this.game.height - this.height;
    }

    draw(ctx) {
        if (this.isRidingCow) {
            // Draw Cow
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x - 10, this.y + 20, this.width + 20, 30);
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y + 20, 10, 10); // Cow Spot
            
            // Draw Player on top
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y - 10, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class Projectile {
    constructor(game, x, y, targetX, targetY, isPowerful) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = isPowerful ? 20 : 10;
        this.height = isPowerful ? 20 : 10;
        this.speed = 0.8;
        this.markedForDeletion = false;
        this.damage = isPowerful ? 50 : 20; // Cow mode deals more damage
        
        // Calculate vector
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Remove if too far (range limit) or off screen
        if (this.x > this.game.camera.x + this.game.width || 
            this.x < this.game.camera.x ||
            this.y > this.game.height ||
            this.y < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        // Spawn off-screen to the right
        this.x = this.game.camera.x + this.game.width + Math.random() * 200;
        this.y = Math.random() * (this.game.height - this.height - 50); // Random height above ground
        this.speed = 0.2 + Math.random() * 0.1; // Random speed
        this.vx = -this.speed;
        this.markedForDeletion = false;
        this.color = 'red';
        this.hp = 30; // Enemies have HP now
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;

        // Remove if off-screen to the left (far behind player/camera)
        if (this.x < this.game.camera.x - 100) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        // Simple Pigeon shape (Triangle pointing left)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }
}

class Item {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; // 'HEAL', 'COW'
        this.markedForDeletion = false;
    }

    draw(ctx) {
        if (this.type === 'HEAL') {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText("+", this.x + 8, this.y + 22);
        } else if (this.type === 'COW') {
            ctx.fillStyle = 'brown'; // Box color
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.fillText("C", this.x + 8, this.y + 22);
        }
    }
}

class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
    }

    update() {
        // Camera follows player x, but keeps player somewhat centered (e.g., 1/3rd of screen width)
        const targetX = this.game.player.x - this.game.width * 0.3;
        if (targetX > this.x) {
            this.x = targetX;
        }
        
        if (this.x < 0) this.x = 0;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.input = new InputHandler();
        
        // Game Entities
        this.player = new Player(this);
        this.camera = new Camera(this);
        this.enemies = [];
        this.projectiles = [];
        this.items = [];

        // Level Design / Item Spawning
        this.nextItemX = 500;

        // Game State
        this.lastTime = 0;
        this.enemyTimer = 0;
        this.enemyInterval = 2000; // Spawn every 2 seconds
        this.gameOver = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Adjust player position if they are off screen due to resize (optional polish)
        if (this.player && this.player.y > this.height - this.player.height) {
            this.player.y = this.height - this.player.height;
        }
    }

    init() {
        console.log("Game Initialized");
        requestAnimationFrame((ts) => this.loop(ts));
    }

    checkCollisions() {
        // Player vs Enemies
        this.enemies.forEach(enemy => {
            if (
                this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y
            ) {
                enemy.markedForDeletion = true;
                
                if (this.player.isRidingCow) {
                    this.player.cowHp -= 10;
                    if (this.player.cowHp <= 0) {
                        this.player.isRidingCow = false;
                        this.player.cowHp = 0;
                    }
                } else {
                    this.player.hp -= 10;
                }
                
                console.log("Player Hit! HP:", this.player.hp);
            }
        });

        // Projectiles vs Enemies
        this.projectiles.forEach(proj => {
            this.enemies.forEach(enemy => {
                if (
                    proj.x < enemy.x + enemy.width &&
                    proj.x + proj.width > enemy.x &&
                    proj.y < enemy.y + enemy.height &&
                    proj.y + proj.height > enemy.y
                ) {
                    proj.markedForDeletion = true;
                    enemy.hp -= proj.damage;
                    if (enemy.hp <= 0) {
                         enemy.markedForDeletion = true;
                    }
                }
            });
        });

        // Player vs Items
        this.items.forEach(item => {
             if (
                this.player.x < item.x + item.width &&
                this.player.x + this.player.width > item.x &&
                this.player.y < item.y + item.height &&
                this.player.y + this.player.height > item.y
            ) {
                item.markedForDeletion = true;
                if (item.type === 'HEAL') {
                    this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
                    if (this.player.isRidingCow) {
                        this.player.cowHp = Math.min(this.player.cowHp + 20, this.player.maxCowHp);
                    }
                } else if (item.type === 'COW') {
                    this.player.isRidingCow = true;
                    this.player.cowHp = this.player.maxCowHp;
                }
            }
        });
    }

    update(deltaTime) {
        this.player.update(deltaTime);
        this.camera.update();

        // Handle Input for Attacks
        const attack = this.input.getAttack();
        if (attack) {
            const worldTargetX = this.camera.x + attack.x;
            const worldTargetY = attack.y; 
            
            const startX = this.player.x + this.player.width/2;
            const startY = this.player.y + this.player.height/2;

            // Power attack if riding cow
            this.projectiles.push(new Projectile(this, startX, startY, worldTargetX, worldTargetY, this.player.isRidingCow));
        }

        // Projectiles
        this.projectiles.forEach(p => p.update(deltaTime));
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        
        // Item Spawning Logic
        if (this.camera.x + this.width > this.nextItemX) {
             const type = Math.random() > 0.7 ? 'COW' : 'HEAL'; // 30% chance for cow
             const y = this.height - 100 - Math.random() * 100;
             this.items.push(new Item(this, this.nextItemX + 100, y, type));
             this.nextItemX += 1500 + Math.random() * 1000;
        }
        
        // Remove collected items
        this.items = this.items.filter(i => !i.markedForDeletion);

        // Enemy Spawning
        this.enemyTimer += deltaTime;
        if (this.enemyTimer > this.enemyInterval) {
            this.enemies.push(new Enemy(this));
            this.enemyTimer = 0;
        }

        // Enemy Updates
        this.enemies.forEach(enemy => enemy.update(deltaTime));
        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);

        this.checkCollisions();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0);

        // Draw World (Background can go here)
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(Math.max(0, this.camera.x - 100), this.height - 50, this.width + 200, 50);

        // Draw Items
        this.items.forEach(item => item.draw(this.ctx));

        this.player.draw(this.ctx);
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        this.ctx.restore();
       
        // UI Rendering (Static, no camera translation)
        this.updateUI();
    }

    updateUI() {
        const healthBar = document.getElementById('health-bar');
        const distanceDisplay = document.getElementById('distance-display');
        const gameOverScreen = document.getElementById('game-over-screen');
        const winScreen = document.getElementById('win-screen');

        // Update Health Bar
        const currentHp = this.player.isRidingCow ? this.player.cowHp : this.player.hp;
        const maxHp = this.player.isRidingCow ? this.player.maxCowHp : this.player.maxHp;
        const percentage = Math.max(0, (currentHp / maxHp) * 100);
        
        if (healthBar) {
            healthBar.style.width = `${percentage}%`;
            healthBar.style.backgroundColor = this.player.isRidingCow ? 'orange' : 'red';
        }

        // Update Distance
        const distance = Math.floor(this.player.x / 100); // 100px = 1m
        if (distanceDisplay) {
             distanceDisplay.innerText = `Distance: ${distance}m`;
        }

        // Win/Loss
        if (distance >= 500 && !this.gameOver) { // Win at 500m for testing
            this.gameOver = true;
            winScreen.classList.remove('hidden');
            winScreen.onclick = () => location.reload();
        }

        if (this.player.hp <= 0 && !this.gameOver) {
            this.gameOver = true;
            gameOverScreen.classList.remove('hidden');
            gameOverScreen.onclick = () => location.reload();
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!this.gameOver) {
            this.update(deltaTime);
            this.draw();
        }

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

const game = new Game();
game.init();
