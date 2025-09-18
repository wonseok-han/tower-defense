/**
 * UI 관리 시스템 - 게임 인터페이스 요소들을 관리
 * HTML 요소들과 게임 상태를 연결하고 업데이트
 */

/**
 * UI 관리자 클래스
 */
class UIManager {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.selectedTowerType = null;

    // UI 요소들 참조 가져오기
    this.initializeElements();

    // 이벤트 리스너 설정
    this.setupEventListeners();

    // 초기 업데이트
    this.updateAll();
  }

  /**
   * UI 요소들을 초기화합니다
   */
  initializeElements() {
    // 게임 통계 요소들
    this.elements.goldAmount = document.getElementById("gold-amount");
    this.elements.livesAmount = document.getElementById("lives-amount");
    this.elements.waveNumber = document.getElementById("wave-number");
    this.elements.scoreAmount = document.getElementById("score-amount");
    this.elements.highScore = document.getElementById("high-score");

    // 게임 컨트롤 요소들
    this.elements.nextWaveButton = document.getElementById("next-wave-button");
    this.elements.nextWaveButtonInline = document.getElementById(
      "next-wave-button-inline"
    );
    this.elements.pauseButton = document.getElementById("pause-button");
    this.elements.pauseButtonInline = document.getElementById(
      "pause-button-inline"
    );
    this.elements.waveTimer = document.getElementById("wave-timer");

    // 타워 선택 요소들
    this.elements.towerCards = document.querySelectorAll(".tower-card");
    this.elements.towerSelectionCards = document.querySelectorAll(
      ".tower-selection-card"
    );

    // 선택된 타워 정보 요소들
    this.elements.selectedTowerInfo = document.getElementById(
      "selected-tower-info"
    );
    this.elements.towerLevel = document.getElementById("tower-level");
    this.elements.towerDamage = document.getElementById("tower-damage");
    this.elements.towerRange = document.getElementById("tower-range");
    this.elements.towerSpeed = document.getElementById("tower-speed");
    this.elements.upgradeButton = document.getElementById("upgrade-button");
    this.elements.sellButton = document.getElementById("sell-button");
    this.elements.upgradeCost = document.getElementById("upgrade-cost");
    this.elements.sellValue = document.getElementById("sell-value");

    // 게임 오버레이 요소들
    this.elements.gameOverlay = document.getElementById("game-overlay");
    this.elements.overlayTitle = document.getElementById("overlay-title");
    this.elements.overlayMessage = document.getElementById("overlay-message");
    this.elements.startButton = document.getElementById("start-button");
    this.elements.restartButton = document.getElementById("restart-button");
  }

  /**
   * 이벤트 리스너를 설정합니다
   */
  setupEventListeners() {
    // 게임 시작/재시작 버튼
    if (this.elements.startButton) {
      this.elements.startButton.addEventListener("click", () => {
        this.startGame();
      });
    }

    if (this.elements.restartButton) {
      this.elements.restartButton.addEventListener("click", () => {
        this.startGame();
      });
    }

    // 다음 웨이브 버튼
    if (this.elements.nextWaveButton) {
      this.elements.nextWaveButton.addEventListener("click", () => {
        this.game.startNextWave();
      });
    }

    // 게임 내 다음 웨이브 버튼
    if (this.elements.nextWaveButtonInline) {
      this.elements.nextWaveButtonInline.addEventListener("click", () => {
        this.game.startNextWave();
      });
    }

    // 일시정지 버튼
    if (this.elements.pauseButton) {
      this.elements.pauseButton.addEventListener("click", () => {
        this.game.togglePause();
      });
    }

    // 게임 내 일시정지 버튼
    if (this.elements.pauseButtonInline) {
      this.elements.pauseButtonInline.addEventListener("click", () => {
        this.game.togglePause();
        this.updatePauseButtonIcon();
      });
    }

    // 타워 선택 카드들
    this.elements.towerCards.forEach((card) => {
      card.addEventListener("click", () => {
        const towerType = card.dataset.tower;
        this.selectTowerType(towerType);
      });
    });

    // 게임 내 타워 선택 카드들
    this.elements.towerSelectionCards.forEach((card) => {
      card.addEventListener("click", () => {
        const towerType = card.dataset.tower;
        this.selectTowerType(towerType);
      });
    });

    // 타워 업그레이드 버튼
    if (this.elements.upgradeButton) {
      this.elements.upgradeButton.addEventListener("click", () => {
        this.game.upgradeTower();
      });
    }

    // 타워 판매 버튼
    if (this.elements.sellButton) {
      this.elements.sellButton.addEventListener("click", () => {
        this.game.sellTower();
      });
    }

    // 키보드 단축키 도움말 토글
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyH") {
        this.toggleHelpPanel();
      }
    });
  }

  /**
   * 게임을 시작합니다
   */
  startGame() {
    this.game.startGame();
    this.hideOverlay();
  }

  /**
   * 타워 타입을 선택합니다
   * @param {string} towerType - 선택할 타워 타입
   */
  selectTowerType(towerType) {
    // 이전 선택 해제
    this.elements.towerCards.forEach((card) => {
      card.classList.remove("selected");
    });

    // 골드 확인
    let cost = this.getTowerCost(towerType);
    if (this.game.gold < cost) {
      this.showNotification("골드가 부족합니다!", "error");
      return;
    }

    // 새로운 선택
    const selectedCard = document.querySelector(`[data-tower="${towerType}"]`);
    if (selectedCard) {
      selectedCard.classList.add("selected");
    }

    this.selectedTowerType = towerType;
    this.game.selectTowerType(towerType);

    this.showNotification("타워를 배치할 위치를 클릭하세요", "info");
  }

  /**
   * 타워 비용을 반환합니다
   * @param {string} towerType - 타워 타입
   * @returns {number} 타워 비용
   */
  getTowerCost(towerType) {
    switch (towerType) {
      case "archer":
        return 10;
      case "cannon":
        return 25;
      case "magic":
        return 20;
      default:
        return 0;
    }
  }

  /**
   * 모든 UI를 업데이트합니다
   */
  updateAll() {
    this.updateGameStats();
    this.updateGameControls();
    this.updateTowerSelection();
    this.updateSelectedTowerInfo();
    this.updateGameState();
    this.updatePauseButtonIcon();
    this.updateNextWaveButton();
  }

  /**
   * 게임 통계를 업데이트합니다
   */
  updateGameStats() {
    if (this.elements.goldAmount) {
      this.elements.goldAmount.textContent = this.game.gold;
    }

    if (this.elements.livesAmount) {
      this.elements.livesAmount.textContent = this.game.lives;

      // 생명이 적을 때 경고 색상
      const livesElement = this.elements.livesAmount.parentElement;
      if (this.game.lives <= 5) {
        livesElement.classList.add("danger");
      } else {
        livesElement.classList.remove("danger");
      }
    }

    if (this.elements.waveNumber) {
      this.elements.waveNumber.textContent = this.game.currentWave;
    }

    if (this.elements.scoreAmount) {
      this.elements.scoreAmount.textContent = this.game.score.toLocaleString();
    }

    // 최고 점수 업데이트
    if (this.elements.highScore) {
      this.elements.highScore.textContent = this.game
        .getHighScore()
        .toLocaleString();
    }
  }

  /**
   * 게임 컨트롤을 업데이트합니다
   */
  updateGameControls() {
    // 다음 웨이브 버튼
    if (this.elements.nextWaveButton) {
      const canStartWave = this.game.state === "wave_preparing";
      this.elements.nextWaveButton.disabled = !canStartWave;
      this.elements.nextWaveButton.style.display = canStartWave
        ? "block"
        : "none";
    }

    // 일시정지 버튼
    if (this.elements.pauseButton) {
      const isPaused = this.game.state === "paused";
      this.elements.pauseButton.textContent = isPaused ? "계속" : "일시정지";
    }

    // 웨이브 타이머
    if (this.elements.waveTimer) {
      if (this.game.state === "wave_preparing") {
        const seconds = Math.ceil(this.game.waveTimer / 1000);
        this.elements.waveTimer.textContent = seconds;
        this.elements.waveTimer.parentElement.style.display = "block";

        // 일시정지 상태일 때 "일시정지" 표시
        if (this.game.isPaused) {
          this.elements.waveTimer.textContent = "일시정지";
        }
      } else {
        this.elements.waveTimer.parentElement.style.display = "none";
      }
    }
  }

  /**
   * 타워 선택 UI를 업데이트합니다
   */
  updateTowerSelection() {
    // 기존 사이드바 타워 카드들
    this.elements.towerCards.forEach((card) => {
      const towerType = card.dataset.tower;
      const cost = this.getTowerCost(towerType);
      const canAfford = this.game.gold >= cost;

      // 구매 가능 여부에 따른 스타일 변경
      if (canAfford) {
        card.classList.remove("disabled");
      } else {
        card.classList.add("disabled");
      }

      // 선택 상태 유지
      if (towerType === this.selectedTowerType && this.game.isPlacingTower) {
        card.classList.add("selected");
      } else if (!this.game.isPlacingTower) {
        card.classList.remove("selected");
        this.selectedTowerType = null;
      }
    });

    // 게임 내 타워 선택 카드들
    this.elements.towerSelectionCards.forEach((card) => {
      const towerType = card.dataset.tower;
      const cost = this.getTowerCost(towerType);
      const canAfford = this.game.gold >= cost;

      // 구매 가능 여부에 따른 스타일 변경
      if (canAfford) {
        card.classList.remove("disabled");
      } else {
        card.classList.add("disabled");
      }

      // 선택 상태 유지
      if (towerType === this.selectedTowerType && this.game.isPlacingTower) {
        card.classList.add("selected");
      } else if (!this.game.isPlacingTower) {
        card.classList.remove("selected");
        this.selectedTowerType = null;
      }
    });
  }

  /**
   * 일시정지 버튼 아이콘을 업데이트합니다
   */
  updatePauseButtonIcon() {
    if (!this.elements.pauseButtonInline) return;

    // 웨이브 준비 단계나 플레이 중일 때, 또는 일시정지 상태일 때 버튼 활성화
    const canPause =
      this.game.state === "playing" ||
      this.game.state === "wave_preparing" ||
      this.game.state === "paused";

    if (this.game.isPaused) {
      this.elements.pauseButtonInline.classList.add("playing");
      this.elements.pauseButtonInline.title = "게임 재개 (스페이스바)";
    } else {
      this.elements.pauseButtonInline.classList.remove("playing");
      this.elements.pauseButtonInline.title = "게임 일시정지 (스페이스바)";
    }

    // 일시정지 가능한 상태에서만 버튼 활성화
    this.elements.pauseButtonInline.disabled = !canPause;
    if (canPause) {
      this.elements.pauseButtonInline.classList.remove("disabled");
    } else {
      this.elements.pauseButtonInline.classList.add("disabled");
    }
  }

  /**
   * 다음 웨이브 버튼 상태를 업데이트합니다
   */
  updateNextWaveButton() {
    if (!this.elements.nextWaveButtonInline) return;

    const canStartNextWave = this.game.canStartNextWave();
    this.elements.nextWaveButtonInline.disabled = !canStartNextWave;

    if (canStartNextWave) {
      this.elements.nextWaveButtonInline.classList.remove("disabled");
    } else {
      this.elements.nextWaveButtonInline.classList.add("disabled");
    }
  }

  /**
   * 타워 정보 UI를 타워 위치에 배치합니다
   * @param {Tower} tower - 선택된 타워
   */
  positionTowerInfoUI(tower) {
    if (!this.elements.selectedTowerInfo) return;

    const canvas = this.game.canvas;
    const uiElement = this.elements.selectedTowerInfo;

    // 타워의 캔버스 내 위치
    const towerX = tower.position.x;
    const towerY = tower.position.y;

    // UI 크기 계산
    const uiWidth = 250; // max-width 값
    const uiHeight = 200; // 예상 높이

    // 캔버스 크기
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 화면 경계를 고려한 위치 계산
    let left = towerX + 30; // 타워 오른쪽에 표시
    let top = towerY - uiHeight / 2; // 타워 중앙에 맞춤

    // 오른쪽 경계를 벗어나면 왼쪽에 표시
    if (left + uiWidth > canvasWidth) {
      left = towerX - uiWidth - 30;
    }

    // 위쪽 경계를 벗어나면 아래쪽에 표시
    if (top < 10) {
      top = towerY + 30;
    }

    // 아래쪽 경계를 벗어나면 위쪽에 표시
    if (top + uiHeight > canvasHeight - 10) {
      top = canvasHeight - uiHeight - 10;
    }

    // UI 위치 설정
    uiElement.style.left = `${left}px`;
    uiElement.style.top = `${top}px`;
  }

  /**
   * 선택된 타워 정보를 업데이트합니다
   */
  updateSelectedTowerInfo() {
    const selectedTower = this.game.towerManager.selectedTower;

    if (selectedTower && this.elements.selectedTowerInfo) {
      this.elements.selectedTowerInfo.classList.remove("hidden");

      // 타워 위치에 UI 표시
      this.positionTowerInfoUI(selectedTower);

      const info = selectedTower.getInfo();

      if (this.elements.towerLevel) {
        this.elements.towerLevel.textContent = info.level;
      }

      if (this.elements.towerDamage) {
        this.elements.towerDamage.textContent = info.damage;
      }

      if (this.elements.towerRange) {
        this.elements.towerRange.textContent = info.range;
      }

      if (this.elements.towerSpeed) {
        // 초당 공격 횟수(APS)와 DPS를 함께 표시
        const aps = parseFloat(info.attackSpeed);
        const dps = Math.round(aps * info.damage);
        this.elements.towerSpeed.textContent = `${aps.toFixed(
          2
        )}회/초 (${dps} DPS)`;
      }

      // 업그레이드 버튼
      if (this.elements.upgradeButton && this.elements.upgradeCost) {
        const upgradeCost = info.upgradeCost;
        this.elements.upgradeCost.textContent = upgradeCost;

        if (upgradeCost > 0 && this.game.gold >= upgradeCost) {
          this.elements.upgradeButton.disabled = false;
          this.elements.upgradeButton.classList.remove("disabled");
        } else {
          this.elements.upgradeButton.disabled = true;
          this.elements.upgradeButton.classList.add("disabled");
        }

        if (upgradeCost === 0) {
          this.elements.upgradeButton.style.display = "none";
        } else {
          this.elements.upgradeButton.style.display = "block";
        }
      }

      // 판매 버튼
      if (this.elements.sellButton && this.elements.sellValue) {
        this.elements.sellValue.textContent = info.sellValue;
      }
    } else if (this.elements.selectedTowerInfo) {
      this.elements.selectedTowerInfo.classList.add("hidden");
    }
  }

  /**
   * 게임 상태에 따른 UI를 업데이트합니다
   */
  updateGameState() {
    switch (this.game.state) {
      case "menu":
        this.showOverlay("게임 시작", "준비되셨나요?", true, false);
        break;

      case "game_over":
        const highScore = Storage.load("highScore", 0);
        const isNewRecord = this.game.score > highScore;
        const message = isNewRecord
          ? `새로운 기록! 최종 점수: ${this.game.score}`
          : `최종 점수: ${this.game.score}`;
        this.showOverlay("게임 오버", message, false, true);
        break;

      case "victory":
        this.showOverlay(
          "승리!",
          `축하합니다! 최종 점수: ${this.game.score}`,
          false,
          true
        );
        break;

      case "playing":
      case "wave_preparing":
      case "paused":
        this.hideOverlay();
        break;
    }
  }

  /**
   * 오버레이를 표시합니다
   * @param {string} title - 제목
   * @param {string} message - 메시지
   * @param {boolean} showStart - 시작 버튼 표시 여부
   * @param {boolean} showRestart - 재시작 버튼 표시 여부
   */
  showOverlay(title, message, showStart = false, showRestart = false) {
    if (!this.elements.gameOverlay) return;

    this.elements.gameOverlay.classList.remove("hidden");

    if (this.elements.overlayTitle) {
      this.elements.overlayTitle.textContent = title;
    }

    if (this.elements.overlayMessage) {
      this.elements.overlayMessage.textContent = message;
    }

    if (this.elements.startButton) {
      this.elements.startButton.style.display = showStart ? "block" : "none";
    }

    if (this.elements.restartButton) {
      this.elements.restartButton.style.display = showRestart
        ? "block"
        : "none";
    }
  }

  /**
   * 오버레이를 숨깁니다
   */
  hideOverlay() {
    if (this.elements.gameOverlay) {
      this.elements.gameOverlay.classList.add("hidden");
    }
  }

  /**
   * 알림 메시지를 표시합니다
   * @param {string} message - 메시지
   * @param {string} type - 타입 ('info', 'success', 'warning', 'error')
   * @param {number} duration - 표시 시간 (밀리초)
   */
  showNotification(message, type = "info", duration = 3000) {
    // 기존 알림 제거
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // 새 알림 생성
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 스타일 설정
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 24px",
      borderRadius: "6px",
      color: "white",
      fontWeight: "bold",
      zIndex: "1000",
      animation: "slideInRight 0.3s ease",
      minWidth: "200px",
      textAlign: "center",
    });

    // 타입별 색상
    switch (type) {
      case "success":
        notification.style.backgroundColor = "#4CAF50";
        break;
      case "warning":
        notification.style.backgroundColor = "#FF9800";
        break;
      case "error":
        notification.style.backgroundColor = "#f44336";
        break;
      default:
        notification.style.backgroundColor = "#2196F3";
    }

    document.body.appendChild(notification);

    // 자동 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, duration);
  }

  /**
   * 도움말 패널을 토글합니다
   */
  toggleHelpPanel() {
    let helpPanel = document.getElementById("help-panel");

    if (!helpPanel) {
      helpPanel = this.createHelpPanel();
    }

    helpPanel.style.display =
      helpPanel.style.display === "none" ? "block" : "none";
  }

  /**
   * 도움말 패널을 생성합니다
   * @returns {HTMLElement} 도움말 패널 요소
   */
  createHelpPanel() {
    const helpPanel = document.createElement("div");
    helpPanel.id = "help-panel";
    helpPanel.innerHTML = `
            <div class="help-content">
                <h3>🎮 게임 조작법</h3>
                <div class="help-section">
                    <h4>⌨️ 키보드 단축키</h4>
                    <ul>
                        <li><kbd>1</kbd> - 궁수 타워 선택</li>
                        <li><kbd>2</kbd> - 대포 타워 선택</li>
                        <li><kbd>3</kbd> - 마법 타워 선택</li>
                        <li><kbd>U</kbd> - 선택된 타워 업그레이드</li>
                        <li><kbd>S</kbd> - 선택된 타워 판매</li>
                        <li><kbd>Space</kbd> - 일시정지/재개</li>
                        <li><kbd>R</kbd> - 게임 재시작 (게임 오버 시)</li>
                        <li><kbd>H</kbd> - 도움말 토글</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h4>🏹 타워 정보</h4>
                    <ul>
                        <li><strong>궁수 타워</strong> - 빠른 공격, 저렴한 비용</li>
                        <li><strong>대포 타워</strong> - 범위 공격, 높은 데미지</li>
                        <li><strong>마법 타워</strong> - 적 둔화, 특수 효과</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h4>👾 적 정보</h4>
                    <ul>
                        <li><strong>정찰병</strong> - 빠르지만 약함</li>
                        <li><strong>기사</strong> - 느리지만 강함, 방어력 보유</li>
                        <li><strong>드래곤</strong> - 공중 유닛, 특수 공격</li>
                    </ul>
                </div>
                <button onclick="this.parentElement.parentElement.style.display='none'">닫기</button>
            </div>
        `;

    // 스타일 설정
    Object.assign(helpPanel.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      color: "white",
      padding: "20px",
      borderRadius: "10px",
      zIndex: "1001",
      maxWidth: "500px",
      maxHeight: "80vh",
      overflow: "auto",
      display: "none",
    });

    // CSS 추가
    if (!document.getElementById("help-panel-styles")) {
      const styles = document.createElement("style");
      styles.id = "help-panel-styles";
      styles.textContent = `
                .help-content h3 { margin-top: 0; color: #FFD700; }
                .help-content h4 { color: #87CEEB; margin-bottom: 10px; }
                .help-content ul { margin: 10px 0; padding-left: 20px; }
                .help-content li { margin: 5px 0; }
                .help-content kbd { 
                    background: #333; 
                    padding: 2px 6px; 
                    border-radius: 3px; 
                    font-family: monospace;
                    font-weight: bold;
                }
                .help-content button {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 15px;
                    width: 100%;
                }
                .help-content button:hover {
                    background: #45a049;
                }
                .help-section { margin-bottom: 15px; }
            `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(helpPanel);
    return helpPanel;
  }

  /**
   * 성능 정보를 표시합니다 (개발용)
   */
  showPerformanceInfo() {
    const info =
      document.getElementById("performance-info") ||
      document.createElement("div");
    info.id = "performance-info";

    const fps = Math.round(1000 / this.game.deltaTime);
    const particleCount = this.game.particleSystem.getParticleCount();
    const enemyCount = this.game.enemyManager.getAliveEnemyCount();
    const towerCount = this.game.towerManager.towers.length;

    info.innerHTML = `
            <div style="position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.7); 
                        color: white; padding: 10px; border-radius: 5px; font-family: monospace; 
                        font-size: 12px; z-index: 999;">
                FPS: ${fps}<br>
                파티클: ${particleCount}<br>
                적: ${enemyCount}<br>
                타워: ${towerCount}<br>
                상태: ${this.game.state}
            </div>
        `;

    if (!info.parentNode) {
      document.body.appendChild(info);
    }
  }

  /**
   * 게임 통계를 애니메이션과 함께 업데이트합니다
   * @param {string} statType - 통계 타입
   * @param {number} oldValue - 이전 값
   * @param {number} newValue - 새로운 값
   */
  animateStatChange(statType, oldValue, newValue) {
    const element = this.elements[`${statType}Amount`];
    if (!element) return;

    // 값이 증가했을 때 녹색, 감소했을 때 빨간색으로 깜빡임
    const isIncrease = newValue > oldValue;
    element.style.color = isIncrease ? "#4CAF50" : "#f44336";
    element.style.transform = "scale(1.2)";

    setTimeout(() => {
      element.style.color = "";
      element.style.transform = "";
    }, 200);

    // 숫자 카운트 애니메이션
    const startTime = performance.now();
    const duration = 300;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentValue = Math.round(lerp(oldValue, newValue, progress));
      element.textContent = currentValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}

// CSS 애니메이션 추가
if (!document.getElementById("ui-animations")) {
  const styles = document.createElement("style");
  styles.id = "ui-animations";
  styles.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .stat-item.danger {
            animation: pulse 1s infinite;
            color: #ff4444 !important;
        }
        
        .tower-card.disabled {
            opacity: 0.5;
            cursor: not-allowed !important;
        }
        
        .tower-card.selected {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            transform: translateY(-2px);
        }
        
        .notification {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
    `;
  document.head.appendChild(styles);
}

/**
 * 게임 오버 화면을 표시합니다
 */
UIManager.prototype.showGameOver = function () {
  const overlay = document.getElementById("game-overlay");
  const title = document.getElementById("overlay-title");
  const content = document.getElementById("overlay-content");

  if (overlay && title && content) {
    const highScore = this.game.getHighScore();
    const isNewRecord = this.game.score > highScore;

    title.textContent = "💀 게임 오버";
    content.innerHTML = `
      <div style="text-align: center; margin: 20px 0;">
        <p style="font-size: 18px; margin: 10px 0;">최종 점수: <span style="color: #ff6666;">${this.game.score.toLocaleString()}</span></p>
        <p style="font-size: 16px; margin: 10px 0;">도달 웨이브: ${
          this.game.currentWave - 1
        }</p>
        ${
          isNewRecord
            ? '<p style="color: #ffd700; font-size: 20px; margin: 15px 0;">🏆 새로운 최고 기록!</p>'
            : `<p style="font-size: 14px; margin: 10px 0;">최고 기록: ${highScore.toLocaleString()}</p>`
        }
        <div style="margin-top: 30px;">
          <button onclick="game.restartGame()" style="
            padding: 12px 24px; 
            font-size: 16px; 
            background: #4CAF50; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 5px;
          ">다시 시작</button>
          <button onclick="location.reload()" style="
            padding: 12px 24px; 
            font-size: 16px; 
            background: #666; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 5px;
          ">메인 메뉴</button>
        </div>
      </div>
    `;
    overlay.classList.remove("hidden");
  }
};

/**
 * 승리 화면을 표시합니다
 */
UIManager.prototype.showVictory = function (survivalBonus, goldBonus) {
  const overlay = document.getElementById("game-overlay");
  const title = document.getElementById("overlay-title");
  const content = document.getElementById("overlay-content");

  if (overlay && title && content) {
    const highScore = this.game.getHighScore();
    const isNewRecord = this.game.score > highScore;

    title.textContent = "🎉 승리!";
    content.innerHTML = `
      <div style="text-align: center; margin: 20px 0;">
        <p style="font-size: 24px; color: #ffd700; margin: 15px 0;">모든 웨이브를 클리어했습니다!</p>
        <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="font-size: 16px; margin: 8px 0;">기본 점수: ${(
            this.game.score -
            survivalBonus -
            goldBonus
          ).toLocaleString()}</p>
          <p style="font-size: 16px; margin: 8px 0;">생존 보너스: <span style="color: #4CAF50;">+${survivalBonus.toLocaleString()}</span> (남은 생명력 ${
      this.game.lives
    } × 100)</p>
          <p style="font-size: 16px; margin: 8px 0;">골드 보너스: <span style="color: #ffd700;">+${goldBonus.toLocaleString()}</span> (남은 골드 ${
      this.game.gold
    } × 10)</p>
          <hr style="margin: 15px 0; border: 1px solid rgba(255, 215, 0, 0.3);">
          <p style="font-size: 20px; font-weight: bold; color: #ffd700;">최종 점수: ${this.game.score.toLocaleString()}</p>
        </div>
        ${
          isNewRecord
            ? '<p style="color: #ffd700; font-size: 20px; margin: 15px 0;">🏆 새로운 최고 기록!</p>'
            : `<p style="font-size: 14px; margin: 10px 0;">최고 기록: ${highScore.toLocaleString()}</p>`
        }
        <div style="margin-top: 30px;">
          <button onclick="game.restartGame()" style="
            padding: 12px 24px; 
            font-size: 16px; 
            background: #4CAF50; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 5px;
          ">다시 도전</button>
          <button onclick="location.reload()" style="
            padding: 12px 24px; 
            font-size: 16px; 
            background: #666; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 5px;
          ">메인 메뉴</button>
        </div>
      </div>
    `;
    overlay.classList.remove("hidden");
  }
};
