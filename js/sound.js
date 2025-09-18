/**
 * 사운드 시스템 - Web Audio API를 사용한 동적 사운드 생성
 * 실제 사운드 파일 없이 프로그래밍으로 게임 사운드를 생성
 */

/**
 * 사운드 관리자 클래스
 */
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.3;
    this.soundEnabled = true;
    this.musicEnabled = true;

    // 사운드 설정
    this.sounds = new Map();
    this.musicLoops = new Map();
    this.currentMusic = null;

    this.initializeAudioContext();
    this.createSounds();
  }

  /**
   * Web Audio Context를 초기화합니다
   */
  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // 마스터 볼륨 노드
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(
        this.masterVolume,
        this.audioContext.currentTime
      );
      this.masterGain.connect(this.audioContext.destination);

      console.log("🔊 사운드 시스템이 초기화되었습니다.");
    } catch (error) {
      console.warn("⚠️ Web Audio API를 사용할 수 없습니다:", error);
      this.soundEnabled = false;
    }
  }

  /**
   * 사용자 상호작용 후 오디오 컨텍스트를 재개합니다
   */
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  /**
   * 게임 사운드들을 생성합니다
   */
  createSounds() {
    if (!this.audioContext) return;

    // 각 사운드의 파라미터 정의
    this.sounds.set("shoot_arrow", {
      type: "arrow",
      frequency: 800,
      duration: 0.1,
      volume: 0.3,
    });

    this.sounds.set("shoot_cannon", {
      type: "explosion",
      frequency: 120,
      duration: 0.3,
      volume: 0.5,
    });

    this.sounds.set("shoot_magic", {
      type: "magic",
      frequency: 600,
      duration: 0.2,
      volume: 0.4,
    });

    this.sounds.set("enemy_hit", {
      type: "hit",
      frequency: 400,
      duration: 0.1,
      volume: 0.2,
    });

    this.sounds.set("enemy_death", {
      type: "death",
      frequency: 200,
      duration: 0.4,
      volume: 0.3,
    });

    this.sounds.set("tower_place", {
      type: "build",
      frequency: 500,
      duration: 0.2,
      volume: 0.4,
    });

    this.sounds.set("tower_upgrade", {
      type: "upgrade",
      frequency: 700,
      duration: 0.3,
      volume: 0.4,
    });

    this.sounds.set("wave_start", {
      type: "fanfare",
      frequency: 440,
      duration: 0.5,
      volume: 0.5,
    });

    this.sounds.set("game_over", {
      type: "fail",
      frequency: 150,
      duration: 1.0,
      volume: 0.6,
    });

    this.sounds.set("victory", {
      type: "victory",
      frequency: 523,
      duration: 1.0,
      volume: 0.6,
    });
  }

  /**
   * 사운드를 재생합니다
   * @param {string} soundName - 사운드 이름
   * @param {number} volumeMultiplier - 볼륨 배수 (선택적)
   */
  playSound(soundName, volumeMultiplier = 1.0) {
    if (
      !this.soundEnabled ||
      !this.audioContext ||
      this.audioContext.state === "suspended"
    ) {
      return;
    }

    const soundConfig = this.sounds.get(soundName);
    if (!soundConfig) {
      console.warn(`알 수 없는 사운드: ${soundName}`);
      return;
    }

    this.resumeAudioContext();

    try {
      switch (soundConfig.type) {
        case "arrow":
          this.createArrowSound(soundConfig, volumeMultiplier);
          break;
        case "explosion":
          this.createExplosionSound(soundConfig, volumeMultiplier);
          break;
        case "magic":
          this.createMagicSound(soundConfig, volumeMultiplier);
          break;
        case "hit":
          this.createHitSound(soundConfig, volumeMultiplier);
          break;
        case "death":
          this.createDeathSound(soundConfig, volumeMultiplier);
          break;
        case "build":
          this.createBuildSound(soundConfig, volumeMultiplier);
          break;
        case "upgrade":
          this.createUpgradeSound(soundConfig, volumeMultiplier);
          break;
        case "fanfare":
          this.createFanfareSound(soundConfig, volumeMultiplier);
          break;
        case "fail":
          this.createFailSound(soundConfig, volumeMultiplier);
          break;
        case "victory":
          this.createVictorySound(soundConfig, volumeMultiplier);
          break;
      }
    } catch (error) {
      console.warn("사운드 재생 오류:", error);
    }
  }

  /**
   * 화살 사운드를 생성합니다
   */
  createArrowSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 오실레이터 생성
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(config.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      config.frequency * 0.5,
      now + config.duration
    );

    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + config.duration);
  }

  /**
   * 폭발 사운드를 생성합니다
   */
  createExplosionSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 노이즈 생성
    const bufferSize = this.audioContext.sampleRate * config.duration;
    const buffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    // 필터로 폭발 사운드 특성 만들기
    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(config.frequency, now);
    filter.frequency.exponentialRampToValueAtTime(
      config.frequency * 0.1,
      now + config.duration
    );

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + config.duration);
  }

  /**
   * 마법 사운드를 생성합니다
   */
  createMagicSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 여러 주파수를 조합한 마법적인 소리
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      const freq = config.frequency * (1 + i * 0.5);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.5, now + config.duration * 0.5);
      osc.frequency.setValueAtTime(freq * 0.8, now + config.duration);

      gain.gain.setValueAtTime(
        config.volume * volumeMultiplier * (0.3 / (i + 1)),
        now
      );
      gain.gain.setValueAtTime(
        gain.gain.value * 1.5,
        now + config.duration * 0.3
      );
      gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.02);
      osc.stop(now + config.duration);
    }
  }

  /**
   * 타격 사운드를 생성합니다
   */
  createHitSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(config.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      config.frequency * 0.3,
      now + config.duration
    );

    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + config.duration);
  }

  /**
   * 죽음 사운드를 생성합니다
   */
  createDeathSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(config.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      config.frequency * 0.1,
      now + config.duration
    );

    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.setValueAtTime(
      gain.gain.value * 0.7,
      now + config.duration * 0.3
    );
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + config.duration);
  }

  /**
   * 건설 사운드를 생성합니다
   */
  createBuildSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 상승하는 톤의 건설 소리
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(config.frequency * 0.5, now);
    osc.frequency.exponentialRampToValueAtTime(
      config.frequency,
      now + config.duration
    );

    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + config.duration);
  }

  /**
   * 업그레이드 사운드를 생성합니다
   */
  createUpgradeSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 상승하는 아르페지오
    const frequencies = [
      config.frequency,
      config.frequency * 1.25,
      config.frequency * 1.5,
    ];

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.setValueAtTime(
        config.volume * volumeMultiplier * 0.4,
        now + i * 0.1 + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    });
  }

  /**
   * 팡파르 사운드를 생성합니다
   */
  createFanfareSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 트럼펫 같은 팡파르
    const notes = [
      config.frequency,
      config.frequency * 1.25,
      config.frequency * 1.5,
      config.frequency * 2,
    ];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.setValueAtTime(
        config.volume * volumeMultiplier * 0.3,
        now + i * 0.1 + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  /**
   * 실패 사운드를 생성합니다
   */
  createFailSound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 하강하는 불협화음
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(config.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      config.frequency * 0.3,
      now + config.duration
    );

    gain.gain.setValueAtTime(config.volume * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + config.duration);
  }

  /**
   * 승리 사운드를 생성합니다
   */
  createVictorySound(config, volumeMultiplier) {
    const now = this.audioContext.currentTime;

    // 승리의 멜로디
    const melody = [
      config.frequency,
      config.frequency * 1.125,
      config.frequency * 1.25,
      config.frequency * 1.5,
      config.frequency * 2,
    ];

    melody.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.15);

      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.setValueAtTime(
        config.volume * volumeMultiplier * 0.4,
        now + i * 0.15 + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  }

  /**
   * 배경음악을 시작합니다
   * @param {string} musicName - 음악 이름
   */
  startMusic(musicName) {
    if (!this.musicEnabled || !this.audioContext) return;

    this.stopMusic();

    switch (musicName) {
      case "menu":
        this.createMenuMusic();
        break;
      case "game":
        this.createGameMusic();
        break;
      case "boss":
        this.createBossMusic();
        break;
    }

    this.currentMusic = musicName;
  }

  /**
   * 배경음악을 중지합니다
   */
  stopMusic() {
    // 현재는 루프 음악이 없으므로 빈 구현
    this.currentMusic = null;
  }

  /**
   * 메뉴 음악을 생성합니다 (간단한 앰비언트)
   */
  createMenuMusic() {
    // 향후 구현 예정
  }

  /**
   * 게임 음악을 생성합니다
   */
  createGameMusic() {
    // 향후 구현 예정
  }

  /**
   * 보스 음악을 생성합니다
   */
  createBossMusic() {
    // 향후 구현 예정
  }

  /**
   * 마스터 볼륨을 설정합니다
   * @param {number} volume - 볼륨 (0.0 ~ 1.0)
   */
  setMasterVolume(volume) {
    this.masterVolume = clamp(volume, 0, 1);
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.masterVolume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * 사운드를 토글합니다
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /**
   * 음악을 토글합니다
   */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  /**
   * 사운드 상태를 반환합니다
   * @returns {Object} 사운드 상태 정보
   */
  getStatus() {
    return {
      soundEnabled: this.soundEnabled,
      musicEnabled: this.musicEnabled,
      masterVolume: this.masterVolume,
      currentMusic: this.currentMusic,
      audioContextState: this.audioContext
        ? this.audioContext.state
        : "unavailable",
    };
  }
}

// 전역 사운드 매니저 인스턴스
let soundManager = null;

/**
 * 사운드 매니저를 초기화합니다
 */
function initializeSoundManager() {
  if (!soundManager) {
    soundManager = new SoundManager();
    window.soundManager = soundManager; // 전역 접근을 위해
  }
  return soundManager;
}

/**
 * 사운드를 재생하는 편의 함수
 * @param {string} soundName - 사운드 이름
 * @param {number} volume - 볼륨 배수
 */
function playSound(soundName, volume = 1.0) {
  if (soundManager) {
    soundManager.playSound(soundName, volume);
  }
}
