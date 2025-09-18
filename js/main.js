/**
 * 메인 진입점 - 게임 초기화 및 시작
 * DOM 로드 완료 후 게임과 UI 시스템을 초기화
 */

// 전역 변수
let game = null;
let uiManager = null;

/**
 * 게임을 초기화합니다
 */
function initializeGame() {
  try {
    console.log("🎮 판타지 타워 디펜스 게임을 초기화합니다...");

    // 캔버스 크기 설정
    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
      throw new Error("게임 캔버스를 찾을 수 없습니다.");
    }

    // 반응형 캔버스 크기 설정
    resizeCanvas();

    // 게임 인스턴스 생성
    game = new Game("game-canvas");

    // UI 관리자 생성
    uiManager = new UIManager(game);

    // 게임 루프 시작
    game.start();

    // 전역 참조 설정 (디버깅용)
    window.game = game;
    window.uiManager = uiManager;

    console.log("✅ 게임이 성공적으로 초기화되었습니다!");

    // 초기 도움말 표시
    setTimeout(() => {
      uiManager.showNotification(
        "H키를 눌러 도움말을 확인하세요!",
        "info",
        5000
      );
    }, 2000);
  } catch (error) {
    console.error("❌ 게임 초기화 중 오류 발생:", error);
    showErrorMessage(
      "게임을 초기화하는 중 오류가 발생했습니다. 페이지를 새로고침해 주세요."
    );
  }
}

/**
 * 캔버스 크기를 조정합니다
 */
function resizeCanvas() {
  const canvas = document.getElementById("game-canvas");
  const container = canvas.parentElement;

  // 컨테이너 크기에 맞춰 캔버스 크기 조정
  const containerRect = container.getBoundingClientRect();
  const aspectRatio = 900 / 600; // 15x10 격자 비율

  let canvasWidth = containerRect.width;
  let canvasHeight = canvasWidth / aspectRatio;

  // 높이가 너무 클 경우 높이 기준으로 조정
  if (canvasHeight > containerRect.height) {
    canvasHeight = containerRect.height;
    canvasWidth = canvasHeight * aspectRatio;
  }

  canvas.width = 900; // 내부 해상도 (15x60 격자)
  canvas.height = 600; // (10x60 격자)
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
}

/**
 * 오류 메시지를 표시합니다
 * @param {string} message - 오류 메시지
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 400px;
    `;
  errorDiv.innerHTML = `
        <h3>⚠️ 오류 발생</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: #ff4444;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        ">새로고침</button>
    `;

  document.body.appendChild(errorDiv);
}

/**
 * 성능 모니터링을 시작합니다 (개발 모드)
 */
function startPerformanceMonitoring() {
  if (window.location.search.includes("debug=true")) {
    setInterval(() => {
      if (uiManager) {
        uiManager.showPerformanceInfo();
      }
    }, 100);

    console.log("🔧 디버그 모드가 활성화되었습니다.");
    console.log("사용 가능한 디버그 명령:");
    console.log("- window.game: 게임 인스턴스");
    console.log("- window.uiManager: UI 관리자");
    console.log("- game.addGold(amount): 골드 추가");
    console.log("- game.currentWave = n: 웨이브 변경");
  }
}

/**
 * 브라우저 호환성을 확인합니다
 */
function checkBrowserCompatibility() {
  const requiredFeatures = [
    "requestAnimationFrame",
    "localStorage",
    "JSON",
    "Math.random",
  ];

  const missingFeatures = requiredFeatures.filter((feature) => {
    const keys = feature.split(".");
    let obj = window;
    for (const key of keys) {
      if (!(key in obj)) return true;
      obj = obj[key];
    }
    return false;
  });

  if (missingFeatures.length > 0) {
    showErrorMessage(
      `브라우저가 게임 실행에 필요한 기능을 지원하지 않습니다.<br>
             누락된 기능: ${missingFeatures.join(", ")}<br>
             최신 브라우저를 사용해 주세요.`
    );
    return false;
  }

  return true;
}

/**
 * 로딩 화면을 표시합니다
 */
function showLoadingScreen() {
  const overlay = document.getElementById("game-overlay");
  const title = document.getElementById("overlay-title");
  const message = document.getElementById("overlay-message");

  if (overlay && title && message) {
    title.textContent = "로딩 중...";
    message.textContent = "게임을 준비하고 있습니다.";
    overlay.classList.remove("hidden");

    // 로딩 스피너 추가
    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    message.appendChild(spinner);
  }
}

/**
 * 웹 워커를 사용한 백그라운드 작업 (선택적)
 */
function initializeWebWorker() {
  if (typeof Worker !== "undefined") {
    try {
      // 간단한 웹 워커로 무거운 계산 작업을 분리할 수 있음
      // 현재는 사용하지 않지만 향후 확장 가능
      console.log("🔧 웹 워커 지원 확인됨");
    } catch (error) {
      console.warn("⚠️ 웹 워커 초기화 실패:", error);
    }
  }
}

/**
 * 서비스 워커 등록 (PWA 지원)
 */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("📱 서비스 워커 등록 성공:", registration);
      })
      .catch((error) => {
        console.log("📱 서비스 워커 등록 실패:", error);
      });
  }
}

/**
 * 게임 데이터 마이그레이션 (버전 업데이트 시)
 */
function migrateGameData() {
  const currentVersion = "1.0.0";
  const savedVersion = Storage.load("gameVersion", "0.0.0");

  if (savedVersion !== currentVersion) {
    console.log(
      `🔄 게임 데이터 마이그레이션: ${savedVersion} → ${currentVersion}`
    );

    // 필요한 마이그레이션 작업 수행
    // 예: 이전 버전의 저장 데이터 형식 변환

    Storage.save("gameVersion", currentVersion);
  }
}

/**
 * 전역 오류 핸들러 설정
 */
function setupGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    console.error("💥 전역 JavaScript 오류:", event.error);

    // 중요한 오류가 아닌 경우 게임 계속 진행
    if (
      !event.error.message.includes("Script error") &&
      !event.error.message.includes("Network")
    ) {
      showErrorMessage(
        "게임 실행 중 오류가 발생했습니다. 게임을 재시작하는 것을 권장합니다."
      );
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("💥 처리되지 않은 Promise 거부:", event.reason);
    event.preventDefault(); // 브라우저 기본 오류 표시 방지
  });
}

/**
 * 키보드 단축키 설정
 */
function setupGlobalKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    // 게임이 초기화되지 않았으면 무시
    if (!game) return;

    // 입력 필드에 포커스가 있으면 무시
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.code) {
      case "F11":
        event.preventDefault();
        toggleFullscreen();
        break;

      case "KeyM":
        event.preventDefault();
        toggleMute();
        break;

      case "Escape":
        event.preventDefault();
        if (game.isPlacingTower) {
          game.isPlacingTower = false;
          game.selectedTowerType = null;
          uiManager.updateTowerSelection();
        }
        break;
    }
  });
}

/**
 * 전체화면 토글
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn("전체화면 모드 진입 실패:", err);
    });
  } else {
    document.exitFullscreen().catch((err) => {
      console.warn("전체화면 모드 종료 실패:", err);
    });
  }
}

/**
 * 음소거 토글 (향후 사운드 시스템 구현 시 사용)
 */
function toggleMute() {
  // 향후 사운드 시스템 구현 시 사용
  console.log("🔊 음소거 토글 (사운드 시스템 미구현)");
}

/**
 * 모바일 디바이스 감지 및 최적화
 */
function optimizeForMobile() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    console.log("📱 모바일 디바이스 감지됨");

    // 모바일 최적화 설정
    document.body.classList.add("mobile");

    // 뷰포트 메타 태그 확인
    let viewport = document.querySelector("meta[name=viewport]");
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content =
        "width=device-width, initial-scale=1.0, user-scalable=no";
      document.head.appendChild(viewport);
    }

    // 터치 이벤트 최적화
    document.addEventListener("touchstart", () => {}, { passive: true });
    document.addEventListener("touchmove", () => {}, { passive: true });
  }
}

/**
 * 창 크기 변경 이벤트 핸들러
 */
function handleResize() {
  resizeCanvas();

  // 게임이 초기화된 후라면 게임에도 알림
  if (game && typeof game.onResize === "function") {
    game.onResize();
  }
}

// DOM 로드 완료 후 초기화
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM 로드 완료, 게임 초기화 시작...");

  // 초기화 순서
  setupGlobalErrorHandlers();

  if (!checkBrowserCompatibility()) {
    return;
  }

  showLoadingScreen();
  optimizeForMobile();
  migrateGameData();
  initializeWebWorker();
  setupGlobalKeyboardShortcuts();

  // 약간의 지연 후 게임 초기화 (로딩 화면 표시를 위해)
  setTimeout(() => {
    initializeGame();
    startPerformanceMonitoring();

    // PWA 기능 (선택적)
    // registerServiceWorker();
  }, 500);
});

// 창 크기 변경 이벤트 리스너
window.addEventListener("resize", handleResize);

// 페이지 언로드 시 정리
window.addEventListener("beforeunload", () => {
  if (game) {
    // 게임 상태 저장 등 정리 작업
    console.log("🔄 게임 종료 중...");
  }
});

// 개발자 콘솔 메시지
console.log(`
🏰 판타지 타워 디펜스 게임
==========================================
개발자 도구를 사용하시는군요! 
다음 명령어들을 사용할 수 있습니다:

🎮 게임 치트:
- game.addGold(1000) : 골드 추가
- game.lives = 999 : 생명 설정
- game.currentWave = 10 : 웨이브 변경

🔧 디버그:
- ?debug=true : URL에 추가하여 디버그 모드
- H키 : 도움말 패널
- F11 : 전체화면
==========================================
`);

// 전역 스코프에 유틸리티 함수 노출 (개발용)
if (
  window.location.hostname === "localhost" ||
  window.location.search.includes("debug=true")
) {
  window.gameUtils = {
    addGold: (amount) => game && game.addGold(amount),
    addScore: (amount) => game && game.addScore(amount),
    setWave: (wave) => game && (game.currentWave = wave),
    setLives: (lives) => game && (game.lives = lives),
    spawnEnemy: (type) => game && game.enemyManager.spawnEnemy(type),
    clearEnemies: () => game && game.enemyManager.clear(),
    showStats: () => {
      if (game) {
        console.table({
          Gold: game.gold,
          Lives: game.lives,
          Score: game.score,
          Wave: game.currentWave,
          State: game.state,
          Enemies: game.enemyManager.getAliveEnemyCount(),
          Towers: game.towerManager.towers.length,
          Particles: game.particleSystem.getParticleCount(),
        });
      }
    },
  };

  console.log("🛠️ 개발자 유틸리티가 window.gameUtils에 로드되었습니다.");
}
