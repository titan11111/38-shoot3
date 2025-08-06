// ゲーム状態管理
class GameState {
    constructor() {
        this.currentStage = 1;
        this.maxStage = 7;
        this.playerHP = 100;
        this.maxHP = 100;
        this.currentWeapon = 0;
        this.unlockedWeapons = ['ピストル'];
        this.gameRunning = false;
        this.gamePaused = false;
    }

    reset() {
        this.currentStage = 1;
        this.playerHP = 100;
        this.currentWeapon = 0;
        this.unlockedWeapons = ['ピストル'];
        this.gameRunning = false;
        this.gamePaused = false;
    }
}

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpPower = 15;
        this.onGround = false;
        this.facing = 1; // 1: 右, -1: 左
        this.animFrame = 0;
        this.animTimer = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }

    update() {
        // 重力適用
        this.velocityY += 0.8;
        
        // 位置更新
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // 地面判定
        if (this.y > canvas.height - 100 - this.height) {
            this.y = canvas.height - 100 - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }
        
        // 画面端判定
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        
        // 摩擦
        this.velocityX *= 0.8;
        
        // アニメーション
        this.animTimer++;
        if (this.animTimer > 10) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }
        
        // 無敵時間
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    moveLeft() {
        this.velocityX = -this.speed;
        this.facing = -1;
    }

    moveRight() {
        this.velocityX = this.speed;
        this.facing = 1;
    }

    jump() {
        if (this.onGround) {
            this.velocityY = -this.jumpPower;
            this.onGround = false;
        }
    }

    takeDamage(amount) {
        if (!this.invulnerable) {
            gameState.playerHP -= amount;
            this.invulnerable = true;
            this.invulnerableTimer = 60; // 1秒無敵
            updateHUD();

            if (gameState.playerHP <= 0) {
                gameState.playerHP = 0;
                gameOver();
            }
        }
    }

    shoot() {
        const bulletX = this.x + (this.facing > 0 ? this.width : 0);
        const bulletY = this.y + this.height / 2;
        bullets.push(new Bullet(bulletX, bulletY, this.facing, gameState.currentWeapon));
    }

    draw(ctx) {
        ctx.save();
        
        // 無敵時の点滅効果
        if (this.invulnerable && Math.floor(this.invulnerableTimer / 5) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        // プレイヤー描画（四角形）
        ctx.fillStyle = '#00ff41';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 顔部分
        ctx.fillStyle = '#ffffff';
        const eyeY = this.y + 10;
        if (this.facing > 0) {
            ctx.fillRect(this.x + 20, eyeY, 4, 4);
            ctx.fillRect(this.x + 26, eyeY, 4, 4);
        } else {
            ctx.fillRect(this.x + 2, eyeY, 4, 4);
            ctx.fillRect(this.x + 8, eyeY, 4, 4);
        }
        
        ctx.restore();
    }
}

// 弾丸クラス
class Bullet {
    constructor(x, y, direction, weaponType) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.weaponType = weaponType;
        this.speed = 12;
        this.damage = 10;
        this.width = 6;
        this.height = 6;
        this.trail = [];
        
        // 武器タイプ別設定
        switch(weaponType) {
            case 0: // ピストル
                this.color = '#ffff55';
                break;
            case 1: // ビットブラスター
                this.color = '#55ffff';
                this.speed = 15;
                break;
            case 2: // クラッシュランチャー
                this.color = '#ff6600';
                this.damage = 25;
                this.width = 12;
                this.height = 8;
                break;
            default:
                this.color = '#ffff00';
        }
    }

    update() {
        this.x += this.speed * this.direction;
        this.trail.push({x: this.x, y: this.y, alpha: 1});
        this.trail.forEach(p => p.alpha -= 0.1);
        this.trail = this.trail.filter(p => p.alpha > 0);
    }

    draw(ctx) {
        this.trail.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(p.x, p.y, this.width, this.height);
        });
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -50 || this.x > canvas.width + 50;
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 24;
        this.height = 24;
        this.hp = 30;
        this.maxHP = 30;
        this.speed = 1;
        this.direction = -1;
        this.animFrame = 0;
        this.animTimer = 0;
        this.shootTimer = 0;
        this.jumpTimer = 0;
        this.damage = 10;
        this.velocityY = 0;
        this.color = '#3366ff';

        if (type === 'jumper') {
            this.color = '#6699ff';
        } else if (type === 'shooter') {
            this.color = '#3355ff';
            this.speed = 0;
        } else if (type === 'runner') {
            this.color = '#33ccff';
            this.speed = 3;
        } else if (type === 'boss') {
            this.width = 64;
            this.height = 64;
            this.hp = 100;
            this.maxHP = 100;
            this.damage = 20;
            this.speed = 2;
            this.color = '#ff0000';
        }
    }

    update() {
        // 重力
        this.velocityY += 0.8;
        this.y += this.velocityY;
        if (this.y > canvas.height - 100 - this.height) {
            this.y = canvas.height - 100 - this.height;
            this.velocityY = 0;
        }

        switch(this.type) {
            case 'jumper':
                this.jumpTimer++;
                if (this.jumpTimer > 120) {
                    this.velocityY = -15;
                    this.jumpTimer = 0;
                }
                this.x += this.speed * this.direction;
                if (this.x <= 0 || this.x >= canvas.width - this.width) {
                    this.direction *= -1;
                }
                break;
            case 'shooter':
                this.shootTimer++;
                if (this.shootTimer > 90) {
                    this.shoot();
                    this.shootTimer = 0;
                }
                break;
            case 'runner':
                this.direction = player.x < this.x ? -1 : 1;
                this.x += this.speed * this.direction;
                this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
                break;
            case 'boss':
                this.x += this.speed * this.direction;
                if (this.x <= 0 || this.x >= canvas.width - this.width) {
                    this.direction *= -1;
                }
                this.shootTimer++;
                if (this.shootTimer > 90) {
                    this.shoot();
                    this.shootTimer = 0;
                }
                break;
            default:
                this.x += this.speed * this.direction;
                if (this.x <= 0 || this.x >= canvas.width - this.width) {
                    this.direction *= -1;
                }
        }

        if (this.checkCollision(player)) {
            player.takeDamage(this.damage);
        }

        // アニメーション
        this.animTimer++;
        if (this.animTimer > 20) {
            this.animFrame = (this.animFrame + 1) % 2;
            this.animTimer = 0;
        }
    }

    shoot() {
        // プレイヤーに向かって弾を撃つ
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / distance) * 5;
        const vy = (dy / distance) * 5;
        
        enemyBullets.push(new EnemyBullet(
            this.x + this.width / 2,
            this.y + this.height / 2,
            vx, vy
        ));
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    checkCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    draw(ctx) {
        // 敵本体
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.restore();

        // HPバー（ボスのみ）
        if (this.type === 'boss') {
            const barWidth = this.width;
            const barHeight = 4;
            const hpRatio = this.hp / this.maxHP;
            
            ctx.fillStyle = '#333333';
            ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
            
            ctx.fillStyle = hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(this.x, this.y - 8, barWidth * hpRatio, barHeight);
        }
        
        // 目
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 4, this.y + 6, 3, 3);
        ctx.fillRect(this.x + this.width - 7, this.y + 6, 3, 3);
    }
}

// 敵の弾丸クラス
class EnemyBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 6;
        this.height = 6;
        this.damage = 15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -50 || this.x > canvas.width + 50 ||
               this.y < -50 || this.y > canvas.height + 50;
    }

    checkCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// ゲーム変数
let canvas, ctx;
let gameState;
let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let keys = {};
let lastTime = 0;
let hudHpFill, enemyCountEl, bulletCountEl;

// ステージ情報
const stageData = [
    { name: "ステージ1: バイナリー街道", boss: "ビットマスター", weapon: "ビットブラスター" },
    { name: "ステージ2: データ地下道", boss: "クラッシュワーム", weapon: "クラッシュランチャー" },
    { name: "ステージ3: クラウドタワー", boss: "フォグキーパー", weapon: "フォグスプレッダー" },
    { name: "ステージ4: ファイアウォール工場", boss: "フレアマシーン", weapon: "フレアショット" },
    { name: "ステージ5: サイバー海峡", boss: "ハイドロコード", weapon: "ハイドロウェーブ" },
    { name: "ステージ6: バグ廃墟", boss: "グリッチキング", weapon: "グリッチレーザー" },
    { name: "ステージ7: 中央制御塔", boss: "エラーオメガ", weapon: null }
];

// 初期化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスサイズ設定
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // ゲーム状態初期化
    gameState = new GameState();

    // イベントリスナー設定
    setupEventListeners();

    hudHpFill = document.getElementById('hudHpFill');
    enemyCountEl = document.getElementById('enemyCount');
    bulletCountEl = document.getElementById('bulletCount');

    // タイトル画面表示
    showScreen('titleScreen');
}

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function setupEventListeners() {
    // キーボード操作
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        if (gameState.gameRunning) {
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    player.jump();
                    break;
                case 'z':
                case 'x':
                    player.shoot();
                    break;
                case 'c':
                    switchWeapon();
                    break;
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // ボタン操作
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
    document.getElementById('titleButton').addEventListener('click', () => showScreen('titleScreen'));
    document.getElementById('nextStageButton').addEventListener('click', nextStage);
    document.getElementById('playAgainButton').addEventListener('click', () => {
        gameState.reset();
        showScreen('titleScreen');
    });
    
    // タッチコントロール
    setupTouchControls();
}

function setupTouchControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const attackBtn = document.getElementById('attackBtn');
    const weaponBtn = document.getElementById('weaponBtn');
    
    // タッチ開始・終了イベント
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['arrowleft'] = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['arrowleft'] = false;
    });
    
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['arrowright'] = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['arrowright'] = false;
    });
    
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState.gameRunning) player.jump();
    });
    
    attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState.gameRunning) player.shoot();
    });
    
    weaponBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState.gameRunning) switchWeapon();
    });
}

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function startGame() {
    gameState.reset();
    gameState.gameRunning = true;
    
    // プレイヤー初期化
    player = new Player(100, canvas.height - 200);
    
    // ステージ初期化
    initStage(gameState.currentStage);
    
    // UI更新
    updateUI();
    
    // ゲーム画面表示
    showScreen('gameScreen');
    
    // ゲームループ開始
    gameLoop();
}

function initStage(stageNum) {
    enemies = [];
    bullets = [];
    enemyBullets = [];
    
    // ステージ情報更新
    document.getElementById('stageName').textContent = stageData[stageNum - 1].name;
    
    // 敵配置
    const types = ['jumper', 'shooter', 'runner'];
    for (let i = 0; i < 3 + stageNum; i++) {
        const x = 200 + i * 150;
        const y = canvas.height - 150;
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(x, y, type));
    }
    
    // ボス追加
    const bossX = canvas.width - 150;
    const bossY = canvas.height - 200;
    enemies.push(new Enemy(bossX, bossY, 'boss'));
}

function updateUI() {
    updateHUD();
    updateWeaponDisplay();
}

function updateWeaponDisplay() {
    const weaponName = gameState.unlockedWeapons[gameState.currentWeapon];
    document.getElementById('currentWeapon').textContent = `武器: ${weaponName}`;
}

function switchWeapon() {
    if (gameState.unlockedWeapons.length > 1) {
        gameState.currentWeapon = (gameState.currentWeapon + 1) % gameState.unlockedWeapons.length;
        updateWeaponDisplay();
    }
}

function updateHUD() {
    const hpPercent = (gameState.playerHP / gameState.maxHP) * 100;
    const hpFill = document.getElementById('hpFill');
    if (hpFill) hpFill.style.width = hpPercent + '%';
    if (hudHpFill) hudHpFill.style.width = hpPercent + '%';
    if (enemyCountEl) enemyCountEl.textContent = enemies.length;
    if (bulletCountEl) bulletCountEl.textContent = bullets.length;
}

function gameLoop(currentTime = 0) {
    if (!gameState.gameRunning) return;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState.gamePaused) return;
    
    // プレイヤー操作
    if (keys['arrowleft'] || keys['a']) {
        player.moveLeft();
    }
    if (keys['arrowright'] || keys['d']) {
        player.moveRight();
    }
    
    // プレイヤー更新
    player.update();
    
    // 敵更新
    enemies.forEach(enemy => enemy.update());
    
    // 弾丸更新
    bullets.forEach(bullet => bullet.update());
    enemyBullets.forEach(bullet => bullet.update());
    
    // 衝突判定
    checkCollisions();

    // 不要オブジェクト削除
    bullets = bullets.filter(bullet => !bullet.isOffScreen());
    enemyBullets = enemyBullets.filter(bullet => !bullet.isOffScreen());
    enemies = enemies.filter(enemy => enemy.hp > 0);

    updateHUD();

    // ステージクリア判定
    if (enemies.length === 0) {
        stageClear();
    }
}

function checkCollisions() {
    // プレイヤー弾と敵の衝突
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                // ダメージ処理
                if (enemy.takeDamage(bullet.damage)) {
                    enemies.splice(enemyIndex, 1);
                }
                bullets.splice(bulletIndex, 1);
            }
        });
    });
    
    // 敵弾とプレイヤーの衝突
    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.checkCollision(player)) {
            player.takeDamage(bullet.damage);
            enemyBullets.splice(bulletIndex, 1);
        }
    });
}

function draw() {
    // 背景クリア
    ctx.fillStyle = `linear-gradient(180deg, #001122, #003366)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#001122');
    gradient.addColorStop(1, '#003366');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 星空エフェクト
    drawStars();
    
    // 地面
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    
    ctx.fillStyle = '#666666';
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.fillRect(i, canvas.height - 100, 2, 100);
    }
    
    // ゲームオブジェクト描画
    player.draw(ctx);
    enemies.forEach(enemy => enemy.draw(ctx));
    bullets.forEach(bullet => bullet.draw(ctx));
    enemyBullets.forEach(bullet => bullet.draw(ctx));

    // drawDebugInfo();
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 23) % (canvas.height - 100);
        const size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
    }
}

function drawDebugInfo() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`ステージ: ${gameState.currentStage}`, 10, canvas.height - 80);
    ctx.fillText(`敵の数: ${enemies.length}`, 10, canvas.height - 60);
    ctx.fillText(`弾丸: ${bullets.length}`, 10, canvas.height - 40);
    ctx.fillText(`HP: ${gameState.playerHP}/${gameState.maxHP}`, 10, canvas.height - 20);
}

function stageClear() {
    gameState.gameRunning = false;
    
    const stageInfo = stageData[gameState.currentStage - 1];
    
    // クリアメッセージ設定
    document.getElementById('clearMessage').textContent = `${stageInfo.boss}を倒した！`;
    
    // 武器獲得処理
    if (stageInfo.weapon && !gameState.unlockedWeapons.includes(stageInfo.weapon)) {
        gameState.unlockedWeapons.push(stageInfo.weapon);
        document.getElementById('weaponGet').textContent = `新武器：${stageInfo.weapon}を獲得！`;
        document.getElementById('weaponGet').style.display = 'block';
    } else {
        document.getElementById('weaponGet').style.display = 'none';
    }
    
    // 最終ステージチェック
    if (gameState.currentStage >= gameState.maxStage) {
        // ゲームクリア
        showScreen('gameCompleteScreen');
    } else {
        // ステージクリア画面
        showScreen('stageClearScreen');
    }
}

function nextStage() {
    gameState.currentStage++;
    gameState.playerHP = gameState.maxHP; // HP全回復
    
    // プレイヤー位置リセット
    player.x = 100;
    player.y = canvas.height - 200;
    player.velocityX = 0;
    player.velocityY = 0;
    
    // 新ステージ初期化
    initStage(gameState.currentStage);
    updateUI();
    
    // ゲーム再開
    gameState.gameRunning = true;
    showScreen('gameScreen');
    gameLoop();
}

function gameOver() {
    gameState.gameRunning = false;
    showScreen('gameOverScreen');
}

// ゲーム開始
window.addEventListener('load', init);
