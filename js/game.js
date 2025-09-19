/**
 * 메인 게임 클래스 - 게임의 핵심 로직과 상태 관리
 * 웨이브 시스템, 게임 상태, 맵 시스템을 통합 관리
 */

/**
 * 게임 상태 열거형
 */
const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  WAVE_PREPARING: "wave_preparing",
  GAME_OVER: "game_over",
  VICTORY: "victory",
};

/**
 * 웨이브 정보 클래스
 */
class Wave {
  /**
   * @param {number} waveNumber - 웨이브 번호
   * @param {Array} enemies - 적 구성 정보
   * @param {number} preparationTime - 준비 시간 (밀리초)
   */
  constructor(waveNumber, enemies, preparationTime = 10000) {
    this.waveNumber = waveNumber;
    this.enemies = enemies; // [{type: 'scout', count: 10, interval: 1000}, ...]
    this.preparationTime = preparationTime;
    this.isCompleted = false;
    this.enemiesSpawned = 0;
    this.totalEnemies = enemies.reduce((sum, enemy) => sum + enemy.count, 0);
  }
}

/**
 * 메인 게임 클래스
 */
class Game {
  constructor(canvasId) {
    // 캔버스 설정
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // 게임 상태
    this.state = GameState.MENU;
    this.isPaused = false;
    this.previousState = null; // 일시정지 전 상태 저장용
    this.lastTime = 0;
    this.deltaTime = 0;

    // 게임 데이터
    this.gold = 50;
    this.lives = 20;
    this.score = 0;
    this.currentWave = 0;
    this.maxWaves = 20;

    // 시스템들
    this.particleSystem = new ParticleSystem();
    this.towerManager = new TowerManager();
    this.enemyManager = new EnemyManager();
    this.soundManager = initializeSoundManager();

    // 웨이브 관리
    this.waves = [];
    this.currentWaveObj = null;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.currentEnemyGroup = 0;

    // 맵 관련 (15x10 격자 시스템)
    this.gridSize = 60; // 더 큰 격자 크기
    this.mapWidth = 15; // 격자 수 (900/60 = 15)
    this.mapHeight = 10; // 격자 수 (600/60 = 10)
    this.path = [];

    // 입력 관리
    this.selectedTowerType = null;
    this.isPlacingTower = false;
    this.mousePosition = new Vector2(0, 0);

    // UI 요소들
    this.damageTexts = [];

    // 게임 초기화
    this.init();
  }

  /**
   * 게임을 초기화합니다
   */
  init() {
    this.setupEventListeners();
    this.createMap();
    this.generateWaves();
    this.setupPath();

    // 전역 참조 설정 (다른 클래스들이 접근할 수 있도록)
    window.game = this;
  }

  /**
   * 이벤트 리스너를 설정합니다
   */
  setupEventListeners() {
    // 마우스 이벤트
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.onMouseClick(e));
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.onRightClick(e);
    });

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => this.onKeyDown(e));

    // 터치 이벤트 (모바일 지원)
    this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), {
      passive: false,
    });

    // 창 크기 변경
    window.addEventListener("resize", () => this.onResize());
  }

  /**
   * 맵을 생성합니다 (15x10 격자 + 장식 요소)
   */
  createMap() {
    // 15x10 격자 맵 생성
    this.map = [];
    for (let y = 0; y < this.mapHeight; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.map[y][x] = {
          x: x * this.gridSize + this.gridSize / 2,
          y: y * this.gridSize + this.gridSize / 2,
          type: "empty", // empty, path, blocked, decoration
          canBuildTower: true,
          decoration: null, // tree, rock, flower
        };
      }
    }

    // 장식 요소 배치 (전략적 위치 고려)
    this.addMapDecorations();
  }

  /**
   * 맵에 장식 요소를 추가합니다
   */
  addMapDecorations() {
    // 나무 배치 (경로 근처 전략적 위치)
    const treePositions = [
      { x: 1, y: 0 },
      { x: 3, y: 1 },
      { x: 5, y: 0 }, // 상단
      { x: 0, y: 4 },
      { x: 2, y: 5 },
      { x: 4, y: 6 }, // 왼쪽 중간
      { x: 8, y: 0 },
      { x: 10, y: 1 },
      { x: 12, y: 0 }, // 중앙 상단
      { x: 6, y: 8 },
      { x: 8, y: 9 },
      { x: 10, y: 8 }, // 하단
      { x: 13, y: 3 },
      { x: 14, y: 5 },
      { x: 13, y: 7 }, // 우측
    ];

    treePositions.forEach((pos) => {
      if (pos.x < this.mapWidth && pos.y < this.mapHeight) {
        this.map[pos.y][pos.x].decoration = "tree";
        this.map[pos.y][pos.x].canBuildTower = false;
      }
    });

    // 바위 배치
    const rockPositions = [
      { x: 0, y: 1 },
      { x: 2, y: 0 },
      { x: 4, y: 2 },
      { x: 7, y: 8 },
      { x: 9, y: 7 },
      { x: 11, y: 9 },
      { x: 14, y: 1 },
      { x: 12, y: 3 },
      { x: 14, y: 8 },
    ];

    rockPositions.forEach((pos) => {
      if (
        pos.x < this.mapWidth &&
        pos.y < this.mapHeight &&
        !this.map[pos.y][pos.x].decoration
      ) {
        this.map[pos.y][pos.x].decoration = "rock";
        this.map[pos.y][pos.x].canBuildTower = false;
      }
    });

    // 꽃 배치 (타워 건설 가능한 곳)
    const flowerPositions = [
      { x: 1, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 2 },
      { x: 7, y: 1 },
      { x: 9, y: 4 },
      { x: 11, y: 2 },
      { x: 2, y: 7 },
      { x: 4, y: 8 },
      { x: 6, y: 6 },
    ];

    flowerPositions.forEach((pos) => {
      if (
        pos.x < this.mapWidth &&
        pos.y < this.mapHeight &&
        !this.map[pos.y][pos.x].decoration
      ) {
        this.map[pos.y][pos.x].decoration = "flower";
        // 꽃은 타워 건설 가능
      }
    });
  }

  /**
   * 전략적 경로를 설정합니다 (15x10 격자에 최적화)
   */
  setupPath() {
    // 15x10 격자에서 구불구불한 경로 (격자 중앙 좌표 사용)
    this.path = [
      new Vector2(-30, 210), // 화면 밖 시작점 (왼쪽 중간)
      new Vector2(30, 210), // 첫 번째 격자 진입
      new Vector2(90, 210), // 직진
      new Vector2(150, 210), // 계속 직진
      new Vector2(210, 150), // 첫 번째 꺾임 (위로)
      new Vector2(270, 90), // 더 위로
      new Vector2(330, 90), // 위쪽 직진
      new Vector2(390, 150), // 두 번째 꺾임 (아래로)
      new Vector2(450, 210), // 중간으로
      new Vector2(510, 270), // 세 번째 꺾임 (아래로)
      new Vector2(570, 330), // 아래쪽으로
      new Vector2(630, 330), // 아래쪽 직진
      new Vector2(690, 270), // 네 번째 꺾임 (위로)
      new Vector2(750, 210), // 중간으로
      new Vector2(810, 150), // 다섯 번째 꺾임 (위로)
      new Vector2(870, 150), // 위쪽 직진
      new Vector2(930, 150), // 화면 밖 끝점
    ];

    // 경로를 맵에 표시
    this.markPathOnMap();

    // 적 관리자에 경로 설정
    this.enemyManager.setPath(this.path);
  }

  /**
   * 경로를 맵에 표시합니다
   */
  markPathOnMap() {
    for (let i = 0; i < this.path.length - 1; i++) {
      const start = this.path[i];
      const end = this.path[i + 1];

      // 두 점 사이의 격자들을 경로로 표시
      const distance = start.distanceTo(end);
      const steps = Math.ceil(distance / (this.gridSize / 2));

      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = Math.floor(lerp(start.x, end.x, t) / this.gridSize);
        const y = Math.floor(lerp(start.y, end.y, t) / this.gridSize);

        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
          this.map[y][x].type = "path";
          this.map[y][x].canBuildTower = false;
        }
      }
    }
  }

  /**
   * 웨이브를 생성합니다
   */
  generateWaves() {
    this.waves = [];

    for (let i = 1; i <= this.maxWaves; i++) {
      const enemies = [];
      const basePreparationTime = Math.max(5000, 15000 - i * 300); // 점진적으로 준비시간 단축

      // 새로운 밸런스 웨이브 구성
      if (i === 1) {
        // 웨이브 1: 정찰병 5마리로 시작
        enemies.push({
          type: "scout",
          count: 5,
          interval: 1000,
        });
      } else if (i === 2) {
        // 웨이브 2: 정찰병 7마리
        enemies.push({
          type: "scout",
          count: 7,
          interval: 900,
        });
      } else if (i === 3) {
        // 웨이브 3: 정찰병 10마리 + 기사 1마리 (새로운 적 등장)
        enemies.push({
          type: "scout",
          count: 10,
          interval: 800,
        });
        enemies.push({
          type: "knight",
          count: 1,
          interval: 3000,
        });
      } else if (i <= 6) {
        // 웨이브 4-6: 정찰병과 기사 혼합
        enemies.push({
          type: "scout",
          count: Math.floor(8 + i * 1.5),
          interval: Math.max(600, 800 - i * 20),
        });
        enemies.push({
          type: "knight",
          count: Math.floor(i - 2),
          interval: Math.max(2000, 3000 - i * 100),
        });

        // 웨이브 6: 드래곤 등장
        if (i === 6) {
          enemies.push({
            type: "dragon",
            count: 1,
            interval: 4000,
          });
        }
      } else if (i <= 12) {
        // 웨이브 7-12: 혼합 웨이브 (모든 적 타입)
        enemies.push({
          type: "scout",
          count: Math.floor(6 + i * 1.2),
          interval: Math.max(500, 700 - i * 15),
        });
        enemies.push({
          type: "knight",
          count: Math.floor(2 + (i - 6) * 0.8),
          interval: Math.max(1500, 2500 - i * 80),
        });
        enemies.push({
          type: "dragon",
          count: Math.floor(1 + (i - 6) * 0.3),
          interval: Math.max(3000, 4000 - i * 100),
        });
      } else {
        // 웨이브 13+: 최고 난이도
        enemies.push({
          type: "scout",
          count: Math.floor(10 + i * 2),
          interval: 400,
        });
        enemies.push({
          type: "knight",
          count: Math.floor(3 + i * 0.7),
          interval: 1200,
        });
        enemies.push({
          type: "dragon",
          count: Math.floor(2 + (i - 12) * 0.5),
          interval: 2500,
        });
      }

      this.waves.push(new Wave(i, enemies, basePreparationTime));
    }
  }

  /**
   * 게임을 시작합니다
   */
  startGame() {
    this.state = GameState.WAVE_PREPARING;
    this.currentWave = 1;
    this.currentWaveObj = this.waves[0];
    this.waveTimer = this.currentWaveObj.preparationTime;

    // 초기 상태 리셋
    this.gold = 50; // 시작 골드를 50으로 조정 (궁수 5개 또는 다양한 조합 가능)
    this.lives = 20;
    this.score = 0;

    // 시스템 초기화
    this.towerManager.clear();
    this.enemyManager.clear();
    this.particleSystem.clear();
    this.damageTexts = [];

    // 사운드 효과
    this.soundManager.playSound("wave_start");
  }

  /**
   * 게임을 일시정지/재개합니다
   */
  togglePause() {
    if (
      this.state === GameState.PLAYING ||
      this.state === GameState.WAVE_PREPARING
    ) {
      this.previousState = this.state; // 일시정지 전 상태 저장
      this.state = GameState.PAUSED;
      this.isPaused = true;
    } else if (this.state === GameState.PAUSED) {
      // 일시정지 전 상태로 복원
      if (this.previousState) {
        this.state = this.previousState;
      } else {
        this.state = GameState.PLAYING;
      }
      this.isPaused = false;
    }
  }

  /**
   * 다음 웨이브를 시작합니다
   */
  startNextWave() {
    if (this.state !== GameState.WAVE_PREPARING) return;

    this.state = GameState.PLAYING;
    this.spawnTimer = 0;
    this.currentEnemyGroup = 0;
    this.currentWaveObj.enemiesSpawned = 0;
  }

  /**
   * 다음 웨이브를 시작할 수 있는지 확인합니다
   * @returns {boolean} 다음 웨이브 시작 가능 여부
   */
  canStartNextWave() {
    return this.state === GameState.WAVE_PREPARING;
  }

  /**
   * 게임을 업데이트합니다
   * @param {number} currentTime - 현재 시간
   */
  update(currentTime) {
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.isPaused) return;

    switch (this.state) {
      case GameState.WAVE_PREPARING:
        this.updateWavePreparation();
        break;
      case GameState.PLAYING:
        this.updateGameplay();
        break;
    }

    // 공통 업데이트
    this.particleSystem.update(this.deltaTime);
    this.updateDamageTexts();

    // UI 업데이트
    if (window.uiManager) {
      window.uiManager.updateAll();
    }

    // 게임 종료 조건 체크
    this.checkGameEnd();
  }

  /**
   * 웨이브 준비 상태를 업데이트합니다
   */
  updateWavePreparation() {
    // 일시정지 상태가 아니면 웨이브 타이머 감소
    if (!this.isPaused) {
      this.waveTimer -= this.deltaTime;

      if (this.waveTimer <= 0) {
        this.startNextWave();
      }
    }

    // 시스템 업데이트 (타워는 계속 작동)
    this.towerManager.update(this.deltaTime, this.enemyManager.enemies);
    this.enemyManager.update(this.deltaTime);
  }

  /**
   * 게임플레이 상태를 업데이트합니다
   */
  updateGameplay() {
    // 적 스폰
    this.updateEnemySpawning();

    // 시스템 업데이트
    this.towerManager.update(this.deltaTime, this.enemyManager.enemies);
    this.enemyManager.update(this.deltaTime);

    // 웨이브 완료 체크
    this.checkWaveCompletion();
  }

  /**
   * 적 스폰을 업데이트합니다
   */
  updateEnemySpawning() {
    if (!this.currentWaveObj || this.currentWaveObj.isCompleted) return;

    this.spawnTimer += this.deltaTime;

    // 현재 스폰해야 할 적 그룹 확인
    if (this.currentEnemyGroup < this.currentWaveObj.enemies.length) {
      const enemyGroup = this.currentWaveObj.enemies[this.currentEnemyGroup];

      if (this.spawnTimer >= enemyGroup.interval) {
        // 적 스폰
        this.enemyManager.spawnEnemy(enemyGroup.type);
        this.currentWaveObj.enemiesSpawned++;

        enemyGroup.count--;
        this.spawnTimer = 0;

        // 현재 그룹 완료 시 다음 그룹으로
        if (enemyGroup.count <= 0) {
          this.currentEnemyGroup++;
        }
      }
    }

    // 모든 적 스폰 완료
    if (
      this.currentWaveObj.enemiesSpawned >= this.currentWaveObj.totalEnemies
    ) {
      this.currentWaveObj.isCompleted = true;
    }
  }

  /**
   * 웨이브 완료를 체크합니다
   */
  checkWaveCompletion() {
    if (
      this.currentWaveObj &&
      this.currentWaveObj.isCompleted &&
      this.enemyManager.getAliveEnemyCount() === 0
    ) {
      // 웨이브 완료 보너스
      this.addGold(10 + this.currentWave * 2);
      this.addScore(50 + this.currentWave * 10);

      // 다음 웨이브 준비
      this.currentWave++;

      if (this.currentWave > this.maxWaves) {
        // 게임 승리
        this.state = GameState.VICTORY;
      } else {
        // 다음 웨이브 준비
        this.state = GameState.WAVE_PREPARING;
        this.currentWaveObj = this.waves[this.currentWave - 1];
        this.waveTimer = this.currentWaveObj.preparationTime;
        this.currentEnemyGroup = 0;
      }
    }
  }

  /**
   * 게임 오버를 체크합니다
   */
  checkGameOver() {
    if (this.lives <= 0) {
      this.state = GameState.GAME_OVER;

      // 최고 점수 저장
      const highScore = Storage.load("highScore", 0);
      if (this.score > highScore) {
        Storage.save("highScore", this.score);
      }

      // 게임 오버 사운드
      this.soundManager.playSound("game_over");
    }
  }

  /**
   * 데미지 텍스트를 업데이트합니다
   */
  updateDamageTexts() {
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const text = this.damageTexts[i];
      text.life -= this.deltaTime;
      text.y -= this.deltaTime * 0.05; // 위로 이동
      text.alpha = text.life / text.maxLife;

      if (text.life <= 0) {
        this.damageTexts.splice(i, 1);
      }
    }
  }

  /**
   * 게임을 렌더링합니다
   */
  render() {
    // 판타지 배경 그라디언트
    const skyGradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      this.canvas.height
    );
    skyGradient.addColorStop(0, "#87CEEB"); // 하늘색
    skyGradient.addColorStop(0.3, "#98FB98"); // 연한 녹색
    skyGradient.addColorStop(0.7, "#90EE90"); // 밝은 녹색
    skyGradient.addColorStop(1, "#228B22"); // 진한 녹색
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 구름 그리기
    this.drawClouds();

    // 풀밭 텍스처
    this.drawGrassTexture();

    // 맵 그리기
    this.drawMap();

    // 게임 오브젝트들 그리기
    this.enemyManager.draw(this.ctx);
    this.towerManager.draw(this.ctx);
    this.particleSystem.draw(this.ctx);

    // 데미지 텍스트 그리기
    this.drawDamageTexts();

    // 타워 배치 미리보기
    if (this.isPlacingTower && this.selectedTowerType) {
      this.drawTowerPlacementPreview();
    }

    // UI 오버레이
    this.drawUIOverlay();
  }

  /**
   * 맵을 그립니다 (15x10 격자 + 장식 요소)
   */
  drawMap() {
    // 격자 그리기 (더 선명하게)
    this.ctx.strokeStyle = "rgba(139, 69, 19, 0.2)"; // 갈색 격자
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.mapWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.gridSize, 0);
      this.ctx.lineTo(x * this.gridSize, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.mapHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.gridSize);
      this.ctx.lineTo(this.canvas.width, y * this.gridSize);
      this.ctx.stroke();
    }

    // 장식 요소 그리기
    this.drawDecorations();

    // 경로 그리기
    this.drawPath();
  }

  /**
   * 장식 요소들을 그립니다
   */
  drawDecorations() {
    this.ctx.save();

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const cell = this.map[y][x];
        if (cell.decoration) {
          const centerX = cell.x;
          const centerY = cell.y;

          switch (cell.decoration) {
            case "tree":
              this.drawTree(centerX, centerY);
              break;
            case "rock":
              this.drawRock(centerX, centerY);
              break;
            case "flower":
              this.drawFlower(centerX, centerY);
              break;
          }
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * 나무를 그립니다
   */
  drawTree(x, y) {
    // 나무 줄기
    this.ctx.fillStyle = "#8B4513";
    this.ctx.fillRect(x - 4, y - 5, 8, 15);

    // 나무 잎 (여러 층)
    this.ctx.fillStyle = "#228B22";
    this.ctx.beginPath();
    this.ctx.arc(x, y - 15, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#32CD32";
    this.ctx.beginPath();
    this.ctx.arc(x - 5, y - 12, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x + 5, y - 12, 12, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 바위를 그립니다
   */
  drawRock(x, y) {
    this.ctx.fillStyle = "#696969";
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 15, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 바위 하이라이트
    this.ctx.fillStyle = "#A9A9A9";
    this.ctx.beginPath();
    this.ctx.ellipse(x - 3, y - 2, 8, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 꽃을 그립니다
   */
  drawFlower(x, y) {
    // 꽃잎들
    const petalColors = ["#FF69B4", "#FFB6C1", "#FF1493"];
    const petalColor = petalColors[Math.floor((x + y) % petalColors.length)];

    this.ctx.fillStyle = petalColor;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const petalX = x + Math.cos(angle) * 8;
      const petalY = y + Math.sin(angle) * 8;

      this.ctx.beginPath();
      this.ctx.arc(petalX, petalY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 꽃 중심
    this.ctx.fillStyle = "#FFD700";
    this.ctx.beginPath();
    this.ctx.arc(x, y, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 경로를 그립니다
   */
  drawPath() {
    if (this.path.length < 2) return;

    // 화면 내 경로 포인트만 필터링
    const visiblePath = this.path.filter(
      (point) =>
        point.x >= 0 &&
        point.x <= this.canvas.width &&
        point.y >= 0 &&
        point.y <= this.canvas.height
    );

    if (visiblePath.length < 2) return;

    // 경로 배경
    this.ctx.strokeStyle = "#8B4513";
    this.ctx.lineWidth = 30;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    this.ctx.beginPath();

    // 화면 경계에서 시작하는 포인트 찾기
    let startPoint = this.path.find((point) => point.x >= 0) || this.path[1];
    this.ctx.moveTo(Math.max(0, startPoint.x), startPoint.y);

    for (let i = 0; i < this.path.length; i++) {
      const point = this.path[i];
      if (point.x >= 0 && point.x <= this.canvas.width) {
        this.ctx.lineTo(point.x, point.y);
      }
    }

    this.ctx.stroke();

    // 경로 중앙선
    this.ctx.strokeStyle = "#D2691E";
    this.ctx.lineWidth = 20;
    this.ctx.stroke();

    // 경로 표시선
    this.ctx.strokeStyle = "#FFD700";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 시작점과 끝점 표시 (화면 내에 있을 때만)
    const visibleStart = this.path.find(
      (point) => point.x >= 0 && point.x <= this.canvas.width
    );
    const visibleEnd = this.path
      .slice()
      .reverse()
      .find((point) => point.x >= 0 && point.x <= this.canvas.width);

    if (visibleStart) {
      this.drawPathPoint(visibleStart, "🏁", "#00ff00");
    }
    if (visibleEnd && visibleEnd !== visibleStart) {
      this.drawPathPoint(visibleEnd, "🏰", "#ff0000");
    }
  }

  /**
   * 경로 포인트를 그립니다
   * @param {Vector2} point - 포인트 위치
   * @param {string} symbol - 표시할 심볼
   * @param {string} color - 색상
   */
  drawPathPoint(point, symbol, color) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#000000";
    this.ctx.fillText(symbol, point.x, point.y + 5);

    this.ctx.restore();
  }

  /**
   * 데미지 텍스트를 그립니다
   */
  drawDamageTexts() {
    this.ctx.save();
    this.ctx.textAlign = "center";

    for (const text of this.damageTexts) {
      const scale = 1 + (1 - text.alpha) * 0.5; // 시작할 때 더 크게
      const fontSize = 16 + (1 - text.alpha) * 8;

      this.ctx.save();
      this.ctx.translate(text.x, text.y);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = text.alpha;

      // 텍스트 아웃라인
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 3;
      this.ctx.font = `bold ${fontSize}px Arial`;
      this.ctx.strokeText(text.damage.toString(), 0, 0);

      // 메인 텍스트
      this.ctx.fillStyle = text.color;
      this.ctx.fillText(text.damage.toString(), 0, 0);

      // 반짝임 효과
      if (text.alpha > 0.7) {
        this.ctx.shadowColor = text.color;
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(text.damage.toString(), 0, 0);
        this.ctx.shadowBlur = 0;
      }

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  /**
   * 타워 배치 미리보기를 그립니다
   */
  drawTowerPlacementPreview() {
    const gridX =
      Math.floor(this.mousePosition.x / this.gridSize) * this.gridSize +
      this.gridSize / 2;
    const gridY =
      Math.floor(this.mousePosition.y / this.gridSize) * this.gridSize +
      this.gridSize / 2;

    const canPlace = this.towerManager.canPlaceTower(gridX, gridY);

    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillStyle = canPlace ? "#00ff0040" : "#ff000040";
    this.ctx.strokeStyle = canPlace ? "#00ff00" : "#ff0000";
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(gridX - 25, gridY - 25, 50, 50);
    this.ctx.strokeRect(gridX - 25, gridY - 25, 50, 50);

    // 타워 아이콘 표시
    this.ctx.globalAlpha = 1;
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = canPlace ? "#000000" : "#ffffff";

    let icon = "?";
    switch (this.selectedTowerType) {
      case "archer":
        icon = "🏹";
        break;
      case "cannon":
        icon = "💥";
        break;
      case "magic":
        icon = "🔮";
        break;
    }

    this.ctx.fillText(icon, gridX, gridY + 7);

    this.ctx.restore();
  }

  /**
   * UI 오버레이를 그립니다
   */
  drawUIOverlay() {
    // 웨이브 준비 중일 때 카운트다운 표시
    if (this.state === GameState.WAVE_PREPARING) {
      this.drawWaveCountdown();
    }

    // 게임 오버 화면
    if (this.state === GameState.GAME_OVER) {
      this.drawGameOverScreen();
    }

    // 승리 화면
    if (this.state === GameState.VICTORY) {
      this.drawVictoryScreen();
    }

    // 일시정지 화면
    if (this.state === GameState.PAUSED) {
      this.drawPausedScreen();
    }
  }

  /**
   * 웨이브 카운트다운을 그립니다
   */
  drawWaveCountdown() {
    const seconds = Math.ceil(this.waveTimer / 1000);

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(this.canvas.width / 2 - 150, 100, 300, 80);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `웨이브 ${this.currentWave} 준비 중...`,
      this.canvas.width / 2,
      130
    );
    this.ctx.fillText(`${seconds}초 후 시작`, this.canvas.width / 2, 160);

    this.ctx.restore();
  }

  /**
   * 게임 오버 화면을 그립니다
   */
  drawGameOverScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#ff0000";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "게임 오버",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      `최종 점수: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.fillText(
      `도달 웨이브: ${this.currentWave}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 30
    );
    this.ctx.fillText(
      "R키를 눌러 다시 시작",
      this.canvas.width / 2,
      this.canvas.height / 2 + 80
    );

    this.ctx.restore();
  }

  /**
   * 승리 화면을 그립니다
   */
  drawVictoryScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#00ff00";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "승리!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      `최종 점수: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.fillText(
      "모든 웨이브를 완료했습니다!",
      this.canvas.width / 2,
      this.canvas.height / 2 + 30
    );
    this.ctx.fillText(
      "R키를 눌러 다시 시작",
      this.canvas.width / 2,
      this.canvas.height / 2 + 80
    );

    this.ctx.restore();
  }

  /**
   * 게임 종료 조건을 확인합니다
   */
  checkGameEnd() {
    // 게임 오버 조건: 생명력이 0 이하
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    // 승리 조건: 모든 웨이브 완료 + 남은 적 없음
    if (
      this.currentWave > this.maxWaves &&
      this.enemyManager.getAliveEnemyCount() === 0 &&
      this.state === GameState.PLAYING
    ) {
      this.victory();
      return;
    }
  }

  /**
   * 게임 오버 처리
   */
  gameOver() {
    if (this.state === GameState.GAME_OVER) return;

    this.state = GameState.GAME_OVER;
    this.saveHighScore();

    // 게임 오버 사운드
    if (this.soundManager) {
      this.soundManager.playSound("game_over");
    }

    // UI 업데이트
    if (window.uiManager) {
      window.uiManager.showGameOver();
    }

    console.log("💀 게임 오버! 최종 점수:", this.score);
  }

  /**
   * 승리 처리
   */
  victory() {
    if (this.state === GameState.VICTORY) return;

    this.state = GameState.VICTORY;

    // 승리 보너스 점수
    const survivalBonus = this.lives * 100;
    const goldBonus = this.gold * 10;
    this.score += survivalBonus + goldBonus;

    this.saveHighScore();

    // 승리 사운드
    if (this.soundManager) {
      this.soundManager.playSound("victory");
    }

    // UI 업데이트
    if (window.uiManager) {
      window.uiManager.showVictory(survivalBonus, goldBonus);
    }

    console.log(
      "🎉 승리! 최종 점수:",
      this.score,
      "| 생존 보너스:",
      survivalBonus,
      "| 골드 보너스:",
      goldBonus
    );
  }

  /**
   * 최고 점수를 저장합니다
   */
  saveHighScore() {
    try {
      const currentHighScore = parseInt(
        localStorage.getItem("towerDefenseHighScore") || "0"
      );
      if (this.score > currentHighScore) {
        localStorage.setItem("towerDefenseHighScore", this.score.toString());
        localStorage.setItem(
          "towerDefenseHighScoreDate",
          new Date().toISOString()
        );
        console.log("🏆 새로운 최고 점수!", this.score);
        return true; // 새 기록
      }
    } catch (error) {
      console.error("최고 점수 저장 실패:", error);
    }
    return false; // 기존 기록
  }

  /**
   * 최고 점수를 불러옵니다
   */
  getHighScore() {
    try {
      return parseInt(localStorage.getItem("towerDefenseHighScore") || "0");
    } catch (error) {
      console.error("최고 점수 로드 실패:", error);
      return 0;
    }
  }

  /**
   * 플레이어가 데미지를 받습니다
   * @param {number} damage - 받은 데미지
   */
  takeDamage(damage) {
    this.lives -= damage;
    this.lives = Math.max(0, this.lives);

    // 생명력 감소 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createExplosionEffect(
        this.canvas.width - 100,
        50,
        {
          count: 15,
          colors: ["#ff0000", "#ff4444", "#ff6666"],
          size: 3,
          speed: 80,
          life: 800,
        }
      );
    }

    console.log(`💔 생명력 감소! 남은 생명력: ${this.lives}`);
  }

  /**
   * 게임을 재시작합니다
   */
  restartGame() {
    console.log("🔄 게임을 재시작합니다...");

    // 게임 상태 초기화
    this.state = GameState.MENU;

    // 오버레이 숨기기
    const overlay = document.getElementById("game-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }

    // 게임 시작
    this.startGame();
  }

  /**
   * 구름을 그립니다
   */
  drawClouds() {
    const time = performance.now() * 0.0001;
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    // 여러 개의 구름
    const clouds = [
      { x: 100 + time * 10, y: 80, size: 1.0 },
      { x: 300 + time * 15, y: 120, size: 0.8 },
      { x: 600 + time * 8, y: 60, size: 1.2 },
      { x: 900 + time * 12, y: 100, size: 0.9 },
    ];

    clouds.forEach((cloud) => {
      const x = (cloud.x % (this.canvas.width + 200)) - 100;
      const y = cloud.y;
      const size = cloud.size;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.scale(size, size);

      // 구름 모양 (여러 원으로 구성)
      this.ctx.beginPath();
      this.ctx.arc(-20, 0, 15, 0, Math.PI * 2);
      this.ctx.arc(-10, -8, 18, 0, Math.PI * 2);
      this.ctx.arc(0, -5, 20, 0, Math.PI * 2);
      this.ctx.arc(10, -8, 16, 0, Math.PI * 2);
      this.ctx.arc(20, 0, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  /**
   * 풀밭 텍스처를 그립니다
   */
  drawGrassTexture() {
    this.ctx.save();

    // 풀잎 그리기
    this.ctx.strokeStyle = "#228B22";
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvas.width; x += 20) {
      for (let y = this.canvas.height * 0.6; y < this.canvas.height; y += 15) {
        if (Math.random() < 0.3) {
          const grassX = x + Math.random() * 15;
          const grassY = y + Math.random() * 10;
          const height = 3 + Math.random() * 5;

          this.ctx.beginPath();
          this.ctx.moveTo(grassX, grassY);
          this.ctx.lineTo(grassX + Math.random() * 2 - 1, grassY - height);
          this.ctx.stroke();
        }
      }
    }

    // 꽃들 추가
    const flowerColors = ["#FF69B4", "#FFD700", "#FF6347", "#9370DB"];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.canvas.width;
      const y =
        this.canvas.height * 0.7 + Math.random() * (this.canvas.height * 0.3);

      this.ctx.fillStyle =
        flowerColors[Math.floor(Math.random() * flowerColors.length)];
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * 일시정지 화면을 그립니다
   */
  drawPausedScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "일시정지",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.font = "18px Arial";
    this.ctx.fillText(
      "스페이스바를 눌러 계속",
      this.canvas.width / 2,
      this.canvas.height / 2 + 40
    );

    this.ctx.restore();
  }

  // === 이벤트 핸들러들 ===

  /**
   * 마우스 이동 이벤트 처리
   * @param {MouseEvent} e - 마우스 이벤트
   */
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = e.clientX - rect.left;
    this.mousePosition.y = e.clientY - rect.top;
  }

  /**
   * 마우스 클릭 이벤트 처리
   * @param {MouseEvent} e - 마우스 이벤트
   */
  onMouseClick(e) {
    if (
      this.state !== GameState.PLAYING &&
      this.state !== GameState.WAVE_PREPARING
    )
      return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPlacingTower && this.selectedTowerType) {
      // 타워 배치
      this.placeTower(x, y);
    } else {
      // 타워 선택
      this.selectTower(x, y);
    }
  }

  /**
   * 우클릭 이벤트 처리
   * @param {MouseEvent} e - 마우스 이벤트
   */
  onRightClick(e) {
    // 타워 배치 모드 취소
    this.isPlacingTower = false;
    this.selectedTowerType = null;
  }

  /**
   * 키보드 이벤트 처리
   * @param {KeyboardEvent} e - 키보드 이벤트
   */
  onKeyDown(e) {
    switch (e.code) {
      case "Space":
        e.preventDefault();
        this.togglePause();
        break;
      case "KeyR":
        if (
          this.state === GameState.GAME_OVER ||
          this.state === GameState.VICTORY
        ) {
          this.startGame();
        }
        break;
      case "Digit1":
        this.selectTowerType("archer");
        break;
      case "Digit2":
        this.selectTowerType("cannon");
        break;
      case "Digit3":
        this.selectTowerType("magic");
        break;
      case "KeyU":
        this.upgradeTower();
        break;
      case "KeyS":
        this.sellTower();
        break;
    }
  }

  // === 터치 이벤트 (모바일 지원) ===

  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.onMouseClick({
      clientX: this.mousePosition.x,
      clientY: this.mousePosition.y,
    });
  }

  /**
   * 창 크기 변경 이벤트 처리
   */
  onResize() {
    // 캔버스 크기 조정 로직 (필요시 구현)
  }

  // === 게임 로직 메서드들 ===

  /**
   * 타워 타입을 선택합니다
   * @param {string} towerType - 타워 타입
   */
  selectTowerType(towerType) {
    let cost = 0;
    switch (towerType) {
      case "archer":
        cost = 10;
        break;
      case "cannon":
        cost = 25;
        break;
      case "magic":
        cost = 20;
        break;
    }

    if (this.gold >= cost) {
      this.selectedTowerType = towerType;
      this.isPlacingTower = true;
    }
  }

  /**
   * 타워를 배치합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   */
  placeTower(x, y) {
    if (!this.selectedTowerType) return;

    // 마우스 클릭 좌표를 격자 중앙 좌표로 변환
    const gridX =
      Math.floor(x / this.gridSize) * this.gridSize + this.gridSize / 2;
    const gridY =
      Math.floor(y / this.gridSize) * this.gridSize + this.gridSize / 2;

    // 배치 가능 여부 확인
    if (!this.towerManager.canPlaceTower(gridX, gridY)) return;

    let cost = 0;
    switch (this.selectedTowerType) {
      case "archer":
        cost = 10;
        break;
      case "cannon":
        cost = 25;
        break;
      case "magic":
        cost = 20;
        break;
    }

    if (this.gold >= cost) {
      const tower = this.towerManager.placeTower(
        this.selectedTowerType,
        gridX,
        gridY
      );
      if (tower) {
        this.gold -= cost;
        this.isPlacingTower = false;
        this.selectedTowerType = null;

        // 배치 효과
        this.particleSystem.createMagicEffect(
          tower.position.x,
          tower.position.y,
          {
            count: 10,
            colors: ["#00ff00", "#44ff44"],
            size: 3,
          }
        );

        // 배치 사운드
        this.soundManager.playSound("tower_place");
      }
    }
  }

  /**
   * 타워를 선택합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   */
  selectTower(x, y) {
    this.towerManager.selectTower(x, y);
  }

  /**
   * 선택된 타워를 업그레이드합니다
   */
  upgradeTower() {
    const tower = this.towerManager.selectedTower;
    if (tower) {
      const cost = tower.getUpgradeCost();
      if (cost > 0 && this.gold >= cost) {
        if (tower.upgrade()) {
          this.gold -= cost;
          this.soundManager.playSound("tower_upgrade");
        }
      }
    }
  }

  /**
   * 선택된 타워를 판매합니다
   */
  sellTower() {
    const sellValue = this.towerManager.sellSelectedTower();
    if (sellValue > 0) {
      this.gold += sellValue;
    }
  }

  /**
   * 골드를 추가합니다
   * @param {number} amount - 추가할 골드 양
   */
  addGold(amount) {
    this.gold += amount;
  }

  /**
   * 점수를 추가합니다
   * @param {number} amount - 추가할 점수
   */
  addScore(amount) {
    this.score += amount;
  }

  /**
   * 데미지를 받습니다 (적이 목적지에 도달했을 때)
   * @param {number} damage - 받을 데미지
   */
  takeDamage(damage) {
    this.lives = Math.max(0, this.lives - damage);

    // 화면 흔들림 효과 등 추가 가능
    this.particleSystem.createExplosion(this.canvas.width - 100, 50, {
      count: 10,
      colors: ["#ff0000", "#ff4444"],
      size: 4,
      speed: 80,
    });
  }

  /**
   * 데미지 텍스트를 표시합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   * @param {number} damage - 데미지 양
   */
  showDamageText(x, y, damage) {
    this.damageTexts.push({
      x: x + randomFloat(-10, 10),
      y: y,
      damage: damage,
      life: 1000,
      maxLife: 1000,
      alpha: 1,
      color: damage >= 50 ? "#ff0000" : damage >= 20 ? "#ff8800" : "#ffaa00",
    });
  }

  /**
   * 게임 루프를 시작합니다
   */
  start() {
    const gameLoop = (currentTime) => {
      this.update(currentTime);
      this.render();
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }
}
