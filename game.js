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
        this.gameLoop = null;
        this.speed = 150;
        
        // DOM elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.overlay = document.getElementById('game-overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.startBtn = document.getElementById('start-btn');
        
        // Initialize
        this.init();
    }
    
    init() {
        this.updateHighScore();
        this.setupEventListeners();
        this.drawInitialScreen();
    }
    
    setupEventListeners() {
        // Start button
        this.startBtn.addEventListener('click', () => this.startGame());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Mobile controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleMobileControl(btn.dataset.direction);
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
        this.speed = 150;
        this.updateScore();
        this.spawnFood();
        
        // Hide overlay
        this.overlay.classList.add('hidden');
        
        // Start game loop
        this.gameRunning = true;
        this.gameLoop = setInterval(() => this.update(), this.speed);
        
        // Initial draw
        this.draw();
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
            this.increaseSpeed();
            this.spawnFood();
        } else {
            // Remove tail if no food
            this.snake.pop();
        }
        
        this.draw();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a2332';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid (subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
                // Head
                const gradient = this.ctx.createRadialGradient(
                    x + this.gridSize / 2, y + this.gridSize / 2, 0,
                    x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2
                );
                gradient.addColorStop(0, '#4ade80');
                gradient.addColorStop(1, '#22c55e');
                this.ctx.fillStyle = gradient;
            } else {
                // Body
                const intensity = 1 - (index / this.snake.length) * 0.5;
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
            
            // Draw eyes on head
            if (index === 0) {
                this.drawEyes(x, y);
            }
        });
    }
    
    drawEyes(x, y) {
        this.ctx.fillStyle = 'white';
        const eyeSize = 4;
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
        
        this.ctx.beginPath();
        this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, eyeSize / 4, 0, Math.PI * 2);
        this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, eyeSize / 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        
        // Draw glowing apple
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 10;
        
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        
        // Draw shine
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 3, centerY - 3, 3, 0, Math.PI * 2);
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
        clearInterval(this.gameLoop);
        
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
