// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOver');
const themeToggle = document.getElementById('themeToggle');
const restartBtn = document.getElementById('restartBtn');

// Game state
let gameRunning = false;
let gameSpeed = 3;
let baseGameSpeed = 3;
let score = 0;
let level = 1;
let health = 3;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let isDarkMode = localStorage.getItem('dinoTheme') === 'dark';

// Performance optimization
let lastTime = 0;
let deltaTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;
let scoreTimer = 0;

// Game objects
let dino = {
    x: 50,
    y: canvas.height - 120,
    width: 40,
    height: 60,
    velocityY: 0,
    jumping: false,
    groundY: canvas.height - 120,
    baseJumpPower: -17,
    jumpPower: -17,
    baseGravity: 0.6,
    gravity: 0.6,
    baseAnimationSpeed: 0.15,
    animationSpeed: 0.15,
    // Smooth animation properties
    currentY: canvas.height - 120,
    targetY: canvas.height - 120,
    legAnimation: 0
};

let obstacles = [];
let clouds = [];
let ground = { x: 0, y: canvas.height - 60, width: canvas.width, height: 60 };

// Initialize game
function init() {
    updateHighScoreDisplay();
    updateHealthDisplay();
    updateScoreDisplay();
    updateLevelDisplay();
    applyTheme();
    generateClouds();
    gameLoop();
}

// Theme management
function applyTheme() {
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('dinoTheme', isDarkMode ? 'dark' : 'light');
    applyTheme();
});

// Score and health management
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
}

function updateLevelDisplay() {
    document.getElementById('level').textContent = level;
}

function updateHighScoreDisplay() {
    document.getElementById('highScore').textContent = highScore;
}

function updateHealthDisplay() {
    for (let i = 1; i <= 3; i++) {
        const heart = document.getElementById(`heart${i}`);
        if (i <= health) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
        }
    }
}

// Cloud generation for background
function generateClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 2,
            y: Math.random() * 150 + 50,
            width: Math.random() * 60 + 40,
            height: Math.random() * 30 + 20,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

// Draw functions
function drawDino() {
    // Enhanced dino color based on level
    let dinoColor = getComputedStyle(document.documentElement).getPropertyValue('--dino-color').trim();
    if (level > 3) {
        // Golden dino at higher levels
        dinoColor = isDarkMode ? '#ffd700' : '#ff8c00';
    } else if (level > 1) {
        // Slightly enhanced color at level 2+
        dinoColor = isDarkMode ? '#ffffff' : '#4a4a4a';
    }
    ctx.fillStyle = dinoColor;
    
    // Smooth interpolation for Y position
    dino.targetY = dino.y;
    dino.currentY += (dino.targetY - dino.currentY) * dino.animationSpeed;
    
    // Draw standing/jumping dino
    ctx.fillRect(dino.x, dino.currentY, dino.width, dino.height);
    // Draw head
    ctx.fillRect(dino.x + 25, dino.currentY - 15, 20, 20);
    
    // Smooth leg animation (faster at higher levels)
    if (gameRunning && !dino.jumping) {
        dino.legAnimation += deltaTime * 0.015 * (1 + level * 0.2);
    }
    const legOffset = Math.sin(dino.legAnimation) * 3;
    ctx.fillRect(dino.x + 5, dino.currentY + dino.height, 8, 15 + legOffset);
    ctx.fillRect(dino.x + 25, dino.currentY + dino.height, 8, 15 - legOffset);
    
    // Draw enhanced eye
    ctx.fillStyle = isDarkMode ? '#000000' : '#ffffff';
    ctx.fillRect(dino.x + 30, dino.currentY - 10, 5, 5);
    
    // Add level indicator glow for higher levels
    if (level > 2) {
        ctx.shadowColor = level > 3 ? '#ffd700' : '#87ceeb';
        ctx.shadowBlur = 5;
        ctx.fillRect(dino.x, dino.currentY, dino.width, dino.height);
        ctx.shadowBlur = 0;
    }
}

function drawObstacles() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--obstacle-color').trim();
    
    obstacles.forEach(obstacle => {
        // Initialize animation time if not exists
        if (!obstacle.animTime) obstacle.animTime = 0;
        obstacle.animTime += deltaTime * 0.001;
        
        switch(obstacle.type) {
            case 'cactus':
                // Draw cactus with slight sway
                const sway = Math.sin(obstacle.animTime * 2) * 0.5;
                ctx.save();
                ctx.translate(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height);
                ctx.rotate(sway * 0.02);
                ctx.fillRect(-obstacle.width/2, -obstacle.height, obstacle.width, obstacle.height);
                // Add cactus arms
                ctx.fillRect(-obstacle.width/2 - 5, -obstacle.height + 10, 8, 15);
                ctx.fillRect(obstacle.width/2 - 3, -obstacle.height + 15, 8, 12);
                ctx.restore();
                break;
                
            case 'bird':
                // Draw bird with smooth wing animation
                const wingFlap = Math.sin(obstacle.animTime * 8) * 4;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                // Smooth wings
                ctx.fillRect(obstacle.x - 5, obstacle.y + wingFlap, 10, 5);
                ctx.fillRect(obstacle.x + obstacle.width - 5, obstacle.y - wingFlap, 10, 5);
                // Add beak
                ctx.fillRect(obstacle.x + obstacle.width, obstacle.y + obstacle.height/2 - 1, 5, 2);
                break;
                
            case 'stone':
                // Draw stone (static rock)
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                // Add stone texture with rough edges
                ctx.fillStyle = isDarkMode ? '#696969' : '#808080';
                ctx.fillRect(obstacle.x + 3, obstacle.y + 3, obstacle.width - 6, obstacle.height - 6);
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--obstacle-color').trim();
                // Add some rocky details
                ctx.fillRect(obstacle.x + 8, obstacle.y + 8, 8, 8);
                ctx.fillRect(obstacle.x + 18, obstacle.y + 15, 6, 6);
                break;
                
            case 'tree':
                // Draw tree trunk
                const trunkWidth = 8;
                const trunkHeight = 40;
                ctx.fillStyle = isDarkMode ? '#8B4513' : '#654321';
                ctx.fillRect(obstacle.x + (obstacle.width - trunkWidth)/2, obstacle.y + obstacle.height - trunkHeight, trunkWidth, trunkHeight);
                
                // Draw tree foliage (crown)
                ctx.fillStyle = isDarkMode ? '#228B22' : '#32CD32';
                const crownSize = obstacle.width;
                ctx.fillRect(obstacle.x, obstacle.y, crownSize, obstacle.height - trunkHeight + 10);
                
                // Add some leaf details
                ctx.fillStyle = isDarkMode ? '#006400' : '#228B22';
                ctx.fillRect(obstacle.x + 3, obstacle.y + 5, crownSize - 6, 15);
                ctx.fillRect(obstacle.x + 5, obstacle.y + 20, crownSize - 10, 10);
                break;
        }
    });
}

function drawClouds() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cloud-color').trim();
    ctx.globalAlpha = 0.7;
    
    clouds.forEach(cloud => {
        // Draw cloud as multiple circles
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.width * 0.3, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.3, cloud.y, cloud.width * 0.4, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.6, cloud.y, cloud.width * 0.3, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.2, cloud.y - cloud.height * 0.3, cloud.width * 0.25, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.5, cloud.y - cloud.height * 0.2, cloud.width * 0.3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

function drawBackground() {
    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isDarkMode) {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
    } else {
        gradient.addColorStop(0, '#87ceeb');
        gradient.addColorStop(0.5, '#b0e0e6');
        gradient.addColorStop(1, '#e0f6ff');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    // Draw grass ground
    const grassGradient = ctx.createLinearGradient(0, ground.y, 0, ground.y + ground.height);
    if (isDarkMode) {
        grassGradient.addColorStop(0, '#2d5016');
        grassGradient.addColorStop(1, '#1a3009');
    } else {
        grassGradient.addColorStop(0, '#7cfc00');
        grassGradient.addColorStop(0.3, '#32cd32');
        grassGradient.addColorStop(1, '#228b22');
    }
    ctx.fillStyle = grassGradient;
    ctx.fillRect(ground.x, ground.y, ground.width, ground.height);
    
    // Draw grass blades
    ctx.strokeStyle = isDarkMode ? '#4a7c59' : '#90ee90';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    
    for (let i = 0; i < canvas.width; i += 8) {
        const x = i + (score % 16);
        const grassHeight = Math.sin(x * 0.1) * 8 + 12;
        ctx.beginPath();
        ctx.moveTo(x, ground.y + ground.height);
        ctx.lineTo(x + Math.sin(x * 0.2) * 2, ground.y + ground.height - grassHeight);
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
}

// Game mechanics
function updateDino() {
    if (dino.jumping) {
        dino.velocityY += dino.gravity;
        dino.y += dino.velocityY;
        
        if (dino.y >= dino.groundY) {
            dino.y = dino.groundY;
            dino.jumping = false;
            dino.velocityY = 0;
        }
    }
}

function updateObstacles() {
    // Move obstacles with smooth movement
    obstacles.forEach(obstacle => {
        obstacle.x -= gameSpeed * (deltaTime / frameTime);
        
        // Check if obstacle has been crossed (award points)
        if (!obstacle.crossed && obstacle.x + obstacle.width < dino.x) {
            obstacle.crossed = true;
            // Award different points based on obstacle type
            let points = 10;
            if (obstacle.type === 'tree') points = 15; // Bonus for medium height obstacles
            if (obstacle.type === 'bird') points = 12; // Bonus for flying obstacles
            score += points;
            updateScoreDisplay();
            
            // Check for level up (every 100 points)
            const newLevel = Math.floor(score / 100) + 1;
            if (newLevel > level) {
                level = newLevel;
                gameSpeed = baseGameSpeed + (level - 1) * 1.5; // Increase speed by 1.5 per level
                
                // Enhance dino abilities with level
                enhanceDinoAbilities();
                
                updateLevelDisplay();
                
                // Level up visual feedback
                showLevelUpMessage();
            }
            
            // Update high score
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('dinoHighScore', highScore);
                updateHighScoreDisplay();
            }
        }
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
    
    // Generate new obstacles with random spacing
    const baseDistance = 200 + (gameSpeed * 20);
    const randomDistance = baseDistance + Math.random() * 300; // Random spacing between 200-500px
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - randomDistance) {
        generateObstacle();
    }
}

function generateObstacle() {
    const types = ['cactus', 'bird', 'stone', 'tree'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle = {
        x: canvas.width,
        type: type,
        crossed: false
    };
    
    switch(type) {
        case 'cactus':
            obstacle.width = 20;
            obstacle.height = 40;
            obstacle.y = canvas.height - 100;
            break;
            
        case 'bird':
            obstacle.width = 30;
            obstacle.height = 15;
            // Birds at varied heights - some very high, some middle
            const heights = [canvas.height - 300, canvas.height - 180, canvas.height - 150];
            obstacle.y = heights[Math.floor(Math.random() * heights.length)];
            break;
            
        case 'stone':
            obstacle.width = 35;
            obstacle.height = 35;
            obstacle.y = canvas.height - 95;
            break;
            
        case 'tree':
            obstacle.width = 25;
            obstacle.height = 80; // Medium height tree
            obstacle.y = canvas.height - 140;
            break;
    }
    
    obstacles.push(obstacle);
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed * (deltaTime / frameTime);
        
        if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width + Math.random() * 200;
            cloud.y = Math.random() * 150 + 50;
        }
    });
}

function checkCollisions() {
    const dinoRect = {
        x: dino.x,
        y: dino.y,
        width: dino.width,
        height: dino.height
    };
    
    obstacles.forEach((obstacle, index) => {
        if (dinoRect.x < obstacle.x + obstacle.width &&
            dinoRect.x + dinoRect.width > obstacle.x &&
            dinoRect.y < obstacle.y + obstacle.height &&
            dinoRect.y + dinoRect.height > obstacle.y) {
            
            // Collision detected
            health--;
            updateHealthDisplay();
            
            // Remove the obstacle that was hit
            obstacles.splice(index, 1);
            
            // Add shake effect
            document.querySelector('.game-container').classList.add('shake');
            setTimeout(() => {
                document.querySelector('.game-container').classList.remove('shake');
            }, 500);
            
            if (health <= 0) {
                gameOver();
            }
        }
    });
}

// Score is now updated in updateObstacles() when crossing obstacles
// This function is no longer needed for scoring
function updateScore() {
    // Reserved for future score-related updates
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHighScore').textContent = highScore;
    gameOverScreen.classList.add('show');
}

function resetGame() {
    gameRunning = true;
    score = 0;
    level = 1;
    health = 3;
    gameSpeed = baseGameSpeed;
    obstacles = [];
    scoreTimer = 0;
    dino.y = dino.groundY;
    dino.currentY = dino.groundY;
    dino.targetY = dino.groundY;
    dino.jumping = false;
    dino.velocityY = 0;
    dino.legAnimation = 0;
    
    // Reset dino abilities to base level
    resetDinoAbilities();
    
    updateScoreDisplay();
    updateLevelDisplay();
    updateHealthDisplay();
    gameOverScreen.classList.remove('show');
    generateClouds();
}

function enhanceDinoAbilities() {
    // Keep jump power the same (no height change)
    dino.jumpPower = dino.baseJumpPower;
    
    // Increase gravity for faster jumps (quicker up and down)
    dino.gravity = dino.baseGravity + (level - 1) * 0.1;
    
    // Increase animation speed for faster transitions
    dino.animationSpeed = dino.baseAnimationSpeed + (level - 1) * 0.03;
    
    // Ensure maximum values
    if (dino.gravity > 1.2) dino.gravity = 1.2;
    if (dino.animationSpeed > 0.4) dino.animationSpeed = 0.4;
}

function resetDinoAbilities() {
    dino.jumpPower = dino.baseJumpPower;
    dino.gravity = dino.baseGravity;
    dino.animationSpeed = dino.baseAnimationSpeed;
}

function showLevelUpMessage() {
    // Create level up message
    const levelUpDiv = document.createElement('div');
    levelUpDiv.className = 'level-up-message';
    levelUpDiv.textContent = `Level ${level}!`;
    levelUpDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(45deg, #ffd700, #ffed4e);
        color: #333;
        padding: 15px 30px;
        border-radius: 25px;
        font-size: 24px;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
        z-index: 1000;
        animation: levelUpAnim 2s ease-out forwards;
    `;
    
    document.body.appendChild(levelUpDiv);
    
    // Remove after animation
    setTimeout(() => {
        if (levelUpDiv.parentNode) {
            levelUpDiv.parentNode.removeChild(levelUpDiv);
        }
    }, 2000);
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    
    switch(e.code) {
        case 'ArrowUp':
        case 'Space':
            e.preventDefault();
            if (!dino.jumping) {
                dino.jumping = true;
                dino.velocityY = dino.jumpPower;
            }
            break;
    }
});

// Event listeners
restartBtn.addEventListener('click', resetGame);

// Start game on spacebar or click
document.addEventListener('keydown', (e) => {
    if (!gameRunning && (e.code === 'Space' || e.code === 'ArrowUp')) {
        e.preventDefault();
        resetGame();
    }
});

canvas.addEventListener('click', () => {
    if (!gameRunning) {
        resetGame();
    }
});

// Main game loop with smooth timing
function gameLoop(currentTime) {
    // Calculate delta time for smooth animations
    if (lastTime === 0) lastTime = currentTime;
    deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Clear canvas with anti-aliasing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Enable smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw background elements
    drawBackground();
    drawClouds();
    drawGround();
    
    if (gameRunning) {
        // Update game objects with delta time
        updateDino();
        updateObstacles();
        updateClouds();
        checkCollisions();
    }
    
    // Draw game objects
    drawDino();
    drawObstacles();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', init);
