/**
 * 게임 유틸리티 함수 모음
 * 수학적 계산, 색상 처리, 애니메이션 등의 헬퍼 함수들
 */

/**
 * 두 점 사이의 거리를 계산합니다
 * @param {number} x1 - 첫 번째 점의 x 좌표
 * @param {number} y1 - 첫 번째 점의 y 좌표
 * @param {number} x2 - 두 번째 점의 x 좌표
 * @param {number} y2 - 두 번째 점의 y 좌표
 * @returns {number} 두 점 사이의 거리
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 두 점 사이의 각도를 계산합니다 (라디안)
 * @param {number} x1 - 시작점 x 좌표
 * @param {number} y1 - 시작점 y 좌표
 * @param {number} x2 - 끝점 x 좌표
 * @param {number} y2 - 끝점 y 좌표
 * @returns {number} 각도 (라디안)
 */
function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * 값을 최소값과 최대값 사이로 제한합니다
 * @param {number} value - 제한할 값
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 제한된 값
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 선형 보간을 수행합니다
 * @param {number} start - 시작값
 * @param {number} end - 끝값
 * @param {number} t - 보간 비율 (0~1)
 * @returns {number} 보간된 값
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * 랜덤한 정수를 생성합니다
 * @param {number} min - 최소값 (포함)
 * @param {number} max - 최대값 (포함)
 * @returns {number} 랜덤 정수
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 랜덤한 실수를 생성합니다
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 랜덤 실수
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 배열에서 랜덤한 요소를 선택합니다
 * @param {Array} array - 선택할 배열
 * @returns {*} 랜덤하게 선택된 요소
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * HSL 색상을 RGB 문자열로 변환합니다
 * @param {number} h - 색조 (0-360)
 * @param {number} s - 채도 (0-100)
 * @param {number} l - 명도 (0-100)
 * @param {number} a - 알파 (0-1, 선택적)
 * @returns {string} RGB 색상 문자열
 */
function hslToRgb(h, s, l, a = 1) {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * 색상을 더 밝게 또는 어둡게 만듭니다
 * @param {string} color - 원본 색상 (hex)
 * @param {number} percent - 밝기 변경 비율 (-100 ~ 100)
 * @returns {string} 변경된 색상
 */
function adjustBrightness(color, percent) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.round(clamp(r + (r * percent) / 100, 0, 255));
  const newG = Math.round(clamp(g + (g * percent) / 100, 0, 255));
  const newB = Math.round(clamp(b + (b * percent) / 100, 0, 255));

  return `#${newR.toString(16).padStart(2, "0")}${newG
    .toString(16)
    .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * 이징 함수들
 */
const Easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - --t * t * t * t,
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

/**
 * 애니메이션 클래스
 */
class Animation {
  /**
   * @param {number} duration - 애니메이션 지속 시간 (밀리초)
   * @param {Function} easing - 이징 함수
   * @param {Function} onUpdate - 업데이트 콜백
   * @param {Function} onComplete - 완료 콜백
   */
  constructor(
    duration,
    easing = Easing.linear,
    onUpdate = null,
    onComplete = null
  ) {
    this.duration = duration;
    this.easing = easing;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.startTime = null;
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * 애니메이션을 시작합니다
   */
  start() {
    this.startTime = performance.now();
    this.isRunning = true;
    this.isPaused = false;
  }

  /**
   * 애니메이션을 업데이트합니다
   * @param {number} currentTime - 현재 시간
   */
  update(currentTime) {
    if (!this.isRunning || this.isPaused) return;

    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easing(progress);

    if (this.onUpdate) {
      this.onUpdate(easedProgress, progress);
    }

    if (progress >= 1) {
      this.isRunning = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * 애니메이션을 일시정지합니다
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * 애니메이션을 재개합니다
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * 애니메이션을 중지합니다
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
  }
}

/**
 * 벡터 클래스
 */
class Vector2 {
  /**
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * 벡터를 복사합니다
   * @returns {Vector2} 복사된 벡터
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * 벡터를 설정합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   */
  set(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 벡터를 더합니다
   * @param {Vector2} vector - 더할 벡터
   * @returns {Vector2} 자기 자신
   */
  add(vector) {
    this.x += vector.x;
    this.y += vector.y;
    return this;
  }

  /**
   * 벡터를 뺍니다
   * @param {Vector2} vector - 뺄 벡터
   * @returns {Vector2} 자기 자신
   */
  subtract(vector) {
    this.x -= vector.x;
    this.y -= vector.y;
    return this;
  }

  /**
   * 벡터에 스칼라를 곱합니다
   * @param {number} scalar - 곱할 스칼라
   * @returns {Vector2} 자기 자신
   */
  multiply(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * 벡터의 크기를 계산합니다
   * @returns {number} 벡터의 크기
   */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * 벡터를 정규화합니다
   * @returns {Vector2} 자기 자신
   */
  normalize() {
    const mag = this.magnitude();
    if (mag > 0) {
      this.x /= mag;
      this.y /= mag;
    }
    return this;
  }

  /**
   * 다른 벡터와의 거리를 계산합니다
   * @param {Vector2} vector - 대상 벡터
   * @returns {number} 거리
   */
  distanceTo(vector) {
    return distance(this.x, this.y, vector.x, vector.y);
  }
}

/**
 * 게임 오브젝트 풀 클래스 (성능 최적화를 위한 오브젝트 재사용)
 */
class ObjectPool {
  /**
   * @param {Function} createFn - 오브젝트 생성 함수
   * @param {Function} resetFn - 오브젝트 리셋 함수
   * @param {number} initialSize - 초기 풀 크기
   */
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.activeObjects = [];

    // 초기 오브젝트 생성
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * 오브젝트를 가져옵니다
   * @returns {*} 재사용 가능한 오브젝트
   */
  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }

    this.activeObjects.push(obj);
    return obj;
  }

  /**
   * 오브젝트를 반환합니다
   * @param {*} obj - 반환할 오브젝트
   */
  release(obj) {
    const index = this.activeObjects.indexOf(obj);
    if (index !== -1) {
      this.activeObjects.splice(index, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  /**
   * 모든 활성 오브젝트를 반환합니다
   */
  releaseAll() {
    while (this.activeObjects.length > 0) {
      this.release(this.activeObjects[0]);
    }
  }
}

/**
 * 로컬 스토리지 유틸리티
 */
const Storage = {
  /**
   * 데이터를 저장합니다
   * @param {string} key - 저장 키
   * @param {*} data - 저장할 데이터
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("로컬 스토리지 저장 실패:", e);
    }
  },

  /**
   * 데이터를 불러옵니다
   * @param {string} key - 불러올 키
   * @param {*} defaultValue - 기본값
   * @returns {*} 불러온 데이터
   */
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn("로컬 스토리지 불러오기 실패:", e);
      return defaultValue;
    }
  },

  /**
   * 데이터를 삭제합니다
   * @param {string} key - 삭제할 키
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("로컬 스토리지 삭제 실패:", e);
    }
  },
};
