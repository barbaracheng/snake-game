class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Game settings
        this.gridSize = 20;
        this.canvasSize = 400;
        this.tileCount = this.canvasSize / this.gridSize;

        // Set canvas size
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;

        // Game state
        this.snake = [];
        this.food = {};
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameLoop = null;
        this.speed = 150;
        this.soundEnabled = true;
        this.difficulty = 'medium';

        // DOM elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.overlay = document.getElementById('game-overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.soundBtn = document.getElementById('sound-btn');
        this.difficultySelect = document.getElementById('difficulty');

        // Initialize
        this.init();
    }

    init() {
        this.updateHighScore();
        this.loadSettings();
        this.setupEventListeners();
        this.drawInitialScreen();
        this.updateSoundIcon();
    }

    loadSettings() {
        // Load sound setting
        const savedSound = localStorage.getItem('snakeSoundEnabled');
        if (savedSound !== null) {
            this.soundEnabled = savedSound === 'true';
        }

        // Load difficulty setting
        const savedDifficulty = localStorage.getItem('snakeDifficulty');
        if (savedDifficulty) {
            this.difficulty = savedDifficulty;
            this.difficultySelect.value = savedDifficulty;
        }
        this.setDifficulty(this.difficulty);
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'eat':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'gameOver':
                oscillator.frequency.value = 200;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'pause':
                oscillator.frequency.value = 400;
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
        }
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        localStorage.setItem('snakeDifficulty', difficulty);

        switch (difficulty) {
            case 'easy':
                this.speed = 200;
                break;
            case 'medium':
                this.speed = 150;
                break;
            case 'hard':
                this.speed = 100;
                break;
        }
    }

    updateSoundIcon() {
        if (this.soundEnabled) {
            this.soundBtn.classList.remove('muted');
        } else {
            this.soundBtn.classList.add('muted');
        }
    }

    setupEventListeners() {
        // Start button
        this.startBtn.addEventListener('click', () => this.startGame());

        // Pause button
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Sound toggle
        this.soundBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('snakeSoundEnabled', this.soundEnabled);
            this.updateSoundIcon();
            if (this.soundEnabled) {
                this.playSound('pause');
            }
        });

        // Difficulty select
        this.difficultySelect.addEventListener('change', (e) => {
            this.setDifficulty(e.target.value);
            if (this.gameRunning) {
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.speed);
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Mobile controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleMobileControl(btn.dataset.direction);
                btn.classList.add('pressed');
                setTimeout(() => btn.classList.remove('pressed'), 100);
            });
            btn.addEventListener('touchend', () => {
                setTimeout(() => btn.classList.remove('pressed'), 100);
            });
            btn.addEventListener('click', () => {
                this.handleMobileControl(btn.dataset.direction);
            });
        });

        // Touch swipe controls
        this.setupSwipeControls();
    }

    setupSwipeControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        });
    }

    handleSwipe(startX, startY, endX, endY) {
        const diffX = endX - startX;
        const diffY = endY - startY;
        const minSwipe = 30;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (Math.abs(diffX) > minSwipe) {
                if (diffX > 0) {
                    this.changeDirection('right');
                } else {
                    this.changeDirection('left');
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(diffY) > minSwipe) {
                if (diffY > 0) {
                    this.changeDirection('down');
                } else {
                    this.changeDirection('up');
                }
            }
        }
    }

    handleKeyDown(e) {
        const keyMap = {
            'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
            'w': 'up', 's': 'down', 'a': 'left', 'd': 'right',
            'W': 'up', 'S': 'down', 'A': 'left', 'D': 'right'
        };

        if (keyMap[e.key]) {
            e.preventDefault();
            this.changeDirection(keyMap[e.key]);
        }
    }

    handleMobileControl(direction) {
        if (this.gameRunning) {
            this.changeDirection(direction);
        }
    }

    changeDirection(newDirection) {
        const opposites = {
            'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
        };

        if (opposites[newDirection] !== this.direction) {
            this.nextDirection = newDirection;
        }
    }

    startGame() {
        // Reset game state
        this.snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gamePaused = false;
        this.setDifficulty(this.difficulty);
        this.updateScore();
        this.spawnFood();

        // Hide overlay and show pause button
        this.overlay.classList.add('hidden');
        this.pauseBtn.classList.add('visible');
        this.canvas.classList.add('game-active');

        // Start game loop
        this.gameRunning = true;
        this.gameLoop = setInterval(() => this.update(), this.speed);

        // Start animation loop for visual effects
        this.animationLoop = requestAnimationFrame(() => this.animate());

        // Initial draw
        this.draw();
    }

    animate() {
        if (this.gameRunning && !this.gamePaused) {
            this.draw();
        }
        this.animationLoop = requestAnimationFrame(() => this.animate());
    }

    togglePause() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            clearInterval(this.gameLoop);
            this.overlayTitle.textContent = '⏸️ 已暂停';
            this.overlayMessage.textContent = '点击下方按钮继续';
            this.startBtn.textContent = '继续游戏';
            this.overlay.classList.remove('hidden');
            this.playSound('pause');
        } else {
            this.overlay.classList.add('hidden');
            this.gameLoop = setInterval(() => this.update(), this.speed);
            this.playSound('pause');
        }
    }

    update() {
        // Update direction
        this.direction = this.nextDirection;

        // Calculate new head position
        const head = { ...this.snake[0] };
        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCount ||
            head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
            return;
        }

        // Check self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }

        // Add new head
        this.snake.unshift(head);

        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.playSound('eat');
            this.animateScoreIncrease();
            this.increaseSpeed();
            this.spawnFood();
        } else {
            // Remove tail if no food
            this.snake.pop();
        }

        this.draw();
    }

    animateScoreIncrease() {
        this.scoreElement.classList.add('score-increase');
        setTimeout(() => {
            this.scoreElement.classList.remove('score-increase');
        }, 500);
    }

    draw() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a2332');
        gradient.addColorStop(1, '#0d1321');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid (subtle)
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }

        // Draw food
        this.drawFood();

        // Draw snake
        this.drawSnake();
    }

    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const padding = 1;

            // Gradient colors from head to tail
            if (index === 0) {
                // Head - add glow effect
                this.ctx.shadowColor = '#22c55e';
                this.ctx.shadowBlur = 8;

                const gradient = this.ctx.createRadialGradient(
                    x + this.gridSize / 2, y + this.gridSize / 2, 0,
                    x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2
                );
                gradient.addColorStop(0, '#4ade80');
                gradient.addColorStop(1, '#22c55e');
                this.ctx.fillStyle = gradient;
            } else {
                // Body
                this.ctx.shadowBlur = 0;
                const intensity = 1 - (index / this.snake.length) * 0.3;
                this.ctx.fillStyle = `rgba(74, 222, 128, ${intensity})`;
            }

            // Draw rounded rectangle
            this.roundRect(
                x + padding,
                y + padding,
                this.gridSize - padding * 2,
                this.gridSize - padding * 2,
                5
            );
            this.ctx.fill();

            // Reset shadow
            this.ctx.shadowBlur = 0;

            // Draw eyes on head
            if (index === 0) {
                this.drawEyes(x, y);
            }
        });
    }

    drawEyes(x, y) {
        const eyeSize = 5;
        const eyeOffset = 5;

        let eye1X, eye1Y, eye2X, eye2Y;

        switch (this.direction) {
            case 'up':
                eye1X = x + eyeOffset;
                eye1Y = y + eyeOffset;
                eye2X = x + this.gridSize - eyeOffset - eyeSize;
                eye2Y = y + eyeOffset;
                break;
            case 'down':
                eye1X = x + eyeOffset;
                eye1Y = y + this.gridSize - eyeOffset - eyeSize;
                eye2X = x + this.gridSize - eyeOffset - eyeSize;
                eye2Y = y + this.gridSize - eyeOffset - eyeSize;
                break;
            case 'left':
                eye1X = x + eyeOffset;
                eye1Y = y + eyeOffset;
                eye2X = x + eyeOffset;
                eye2Y = y + this.gridSize - eyeOffset - eyeSize;
                break;
            case 'right':
                eye1X = x + this.gridSize - eyeOffset - eyeSize;
                eye1Y = y + eyeOffset;
                eye2X = x + this.gridSize - eyeOffset - eyeSize;
                eye2Y = y + this.gridSize - eyeOffset - eyeSize;
                break;
        }

        // Eye whites
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, eyeSize / 3, 0, Math.PI * 2);
        this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, eyeSize / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye highlights
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(eye1X + eyeSize / 2 + 1, eye1Y + eyeSize / 2 - 1, 1, 0, Math.PI * 2);
        this.ctx.arc(eye2X + eyeSize / 2 + 1, eye2Y + eyeSize / 2 - 1, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        const radius = this.gridSize / 2 - 2;

        // Draw glow effect
        const time = Date.now() / 1000;
        const glowSize = 10 + Math.sin(time * 3) * 3;

        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = glowSize;

        // Draw apple body with gradient
        const gradient = this.ctx.createRadialGradient(
            centerX - 2, centerY - 2, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, '#fbbf24');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#d97706');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;

        // Draw leaf
        this.ctx.fillStyle = '#22c55e';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX + 2, centerY - radius + 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw shine
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 3, centerY - 3, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    spawnFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

        this.food = newFood;
    }

    updateScore() {
        this.scoreElement.textContent = this.score;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScore();
            localStorage.setItem('snakeHighScore', this.highScore);
        }
    }

    updateHighScore() {
        this.highScoreElement.textContent = this.highScore;
    }

    increaseSpeed() {
        if (this.speed > 80) {
            this.speed -= 2;
            clearInterval(this.gameLoop);
            this.gameLoop = setInterval(() => this.update(), this.speed);
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoop);
        cancelAnimationFrame(this.animationLoop);
        this.pauseBtn.classList.remove('visible');
        this.canvas.classList.remove('game-active');
        this.playSound('gameOver');

        // Show overlay
        this.overlayTitle.textContent = '💀 游戏结束';
        this.overlayMessage.textContent = `最终得分: ${this.score}`;
        this.startBtn.textContent = '再来一局';
        this.overlay.classList.remove('hidden');
    }

    drawInitialScreen() {
        this.draw();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
