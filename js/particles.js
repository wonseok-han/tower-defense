/**
 * 파티클 시스템 - 게임의 시각적 효과를 담당
 * 폭발, 마법 효과, 타격 효과 등을 구현
 */

/**
 * 개별 파티클 클래스
 */
class Particle {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} vx - x 방향 속도
   * @param {number} vy - y 방향 속도
   * @param {string} color - 파티클 색상
   * @param {number} size - 파티클 크기
   * @param {number} life - 생명 시간 (밀리초)
   * @param {string} type - 파티클 타입
   */
  constructor(x, y, vx, vy, color, size, life, type = "circle") {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    this.gravity = 0;
    this.friction = 0.98;
    this.alpha = 1;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.scale = 1;
    this.isAlive = true;
  }

  /**
   * 파티클을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    if (!this.isAlive) return;

    // 위치 업데이트
    this.position.add(
      new Vector2(this.velocity.x * deltaTime, this.velocity.y * deltaTime)
    );

    // 중력 적용
    this.velocity.y += this.gravity * deltaTime;

    // 마찰 적용
    this.velocity.multiply(this.friction);

    // 회전 업데이트
    this.rotation += this.rotationSpeed * deltaTime;

    // 생명 시간 감소
    this.life -= deltaTime;

    // 알파와 크기 계산 (생명 시간에 따라)
    const lifeRatio = this.life / this.maxLife;
    this.alpha = lifeRatio;
    this.size = this.initialSize * this.scale * lifeRatio;

    // 생명 종료 확인
    if (this.life <= 0) {
      this.isAlive = false;
    }
  }

  /**
   * 파티클을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    if (!this.isAlive || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;

    switch (this.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "square":
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        break;

      case "star":
        this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
        break;

      case "spark":
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.moveTo(0, -this.size);
        ctx.lineTo(0, this.size);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  /**
   * 별 모양을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   * @param {number} cx - 중심 x 좌표
   * @param {number} cy - 중심 y 좌표
   * @param {number} spikes - 별의 꼭짓점 수
   * @param {number} outerRadius - 외부 반지름
   * @param {number} innerRadius - 내부 반지름
   */
  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 파티클을 리셋합니다 (오브젝트 풀용)
   */
  reset() {
    this.position.set(0, 0);
    this.velocity.set(0, 0);
    this.color = "#ffffff";
    this.size = 1;
    this.initialSize = 1;
    this.life = 1000;
    this.maxLife = 1000;
    this.type = "circle";
    this.gravity = 0;
    this.friction = 0.98;
    this.alpha = 1;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.scale = 1;
    this.isAlive = true;
  }
}

/**
 * 파티클 시스템 클래스
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.lightningLines = []; // 번개 선을 저장할 배열
    this.particlePool = new ObjectPool(
      () => new Particle(0, 0, 0, 0, "#ffffff", 1, 1000),
      (particle) => particle.reset(),
      50
    );
  }

  /**
   * 파티클을 생성합니다
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {Object} options - 파티클 옵션
   */
  createParticle(x, y, options = {}) {
    const particle = this.particlePool.get();

    particle.position.set(x, y);
    particle.velocity.set(
      options.vx || randomFloat(-50, 50),
      options.vy || randomFloat(-50, 50)
    );
    particle.color = options.color || "#ffffff";
    particle.size = options.size || randomFloat(2, 6);
    particle.initialSize = particle.size;
    particle.life = options.life || randomFloat(500, 1500);
    particle.maxLife = particle.life;
    particle.type = options.type || "circle";
    particle.gravity = options.gravity || 0;
    particle.friction = options.friction || 0.98;
    particle.rotationSpeed = options.rotationSpeed || randomFloat(-0.1, 0.1);
    particle.scale = options.scale || 1;
    particle.isAlive = true;

    this.particles.push(particle);
  }

  /**
   * 폭발 효과를 생성합니다
   * @param {number} x - 폭발 중심 x 좌표
   * @param {number} y - 폭발 중심 y 좌표
   * @param {Object} options - 폭발 옵션
   */
  createExplosion(x, y, options = {}) {
    const particleCount = options.count || 20;
    const colors = options.colors || [
      "#ff4444",
      "#ff8844",
      "#ffaa44",
      "#ffdd44",
    ];
    const speed = options.speed || 100;
    const size = options.size || 4;
    const life = options.life || 800;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + randomFloat(-0.3, 0.3);
      const velocity = randomFloat(speed * 0.5, speed * 1.5);

      this.createParticle(x, y, {
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: randomChoice(colors),
        size: randomFloat(size * 0.5, size * 1.5),
        life: randomFloat(life * 0.7, life * 1.3),
        type: "circle",
        gravity: 50,
        friction: 0.95,
      });
    }
  }

  /**
   * 마법 효과를 생성합니다
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {Object} options - 마법 효과 옵션
   */
  createMagicEffect(x, y, options = {}) {
    const particleCount = options.count || 15;
    const colors = options.colors || [
      "#4444ff",
      "#6666ff",
      "#8888ff",
      "#aaaaff",
    ];
    const size = options.size || 3;
    const life = options.life || 1200;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomFloat(0, Math.PI * 2);
      const distance = randomFloat(10, 30);
      const startX = x + Math.cos(angle) * distance;
      const startY = y + Math.sin(angle) * distance;

      this.createParticle(startX, startY, {
        vx: randomFloat(-20, 20),
        vy: randomFloat(-50, -20),
        color: randomChoice(colors),
        size: randomFloat(size * 0.5, size * 1.5),
        life: randomFloat(life * 0.8, life * 1.2),
        type: "star",
        gravity: -10,
        friction: 0.99,
        rotationSpeed: randomFloat(-0.2, 0.2),
      });
    }
  }

  /**
   * 번개 효과를 생성합니다
   * @param {number} startX - 시작 x 좌표
   * @param {number} startY - 시작 y 좌표
   * @param {number} endX - 끝 x 좌표
   * @param {number} endY - 끝 y 좌표
   */
  createLightningEffect(startX, startY, endX, endY) {
    // 번개 선 그리기
    this.lightningLines.push({
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      life: 200,
      maxLife: 200,
      alpha: 1.0,
    });

    // 번개 충격 파티클
    const particleCount = 12;
    const colors = ["#ffffff", "#ffff88", "#88ffff", "#ff88ff"];

    for (let i = 0; i < particleCount; i++) {
      const angle = randomFloat(0, Math.PI * 2);
      const distance = randomFloat(5, 15);
      const particleX = endX + Math.cos(angle) * distance;
      const particleY = endY + Math.sin(angle) * distance;

      this.createParticle(particleX, particleY, {
        vx: randomFloat(-30, 30),
        vy: randomFloat(-30, 30),
        color: randomChoice(colors),
        size: randomFloat(2, 4),
        life: randomFloat(300, 600),
        type: "circle",
        gravity: 0,
        friction: 0.95,
      });
    }
  }

  /**
   * 타격 효과를 생성합니다
   * @param {number} x - 타격 지점 x 좌표
   * @param {number} y - 타격 지점 y 좌표
   * @param {Object} options - 타격 효과 옵션
   */
  createHitEffect(x, y, options = {}) {
    const particleCount = options.count || 8;
    const color = options.color || "#ffff44";
    const size = options.size || 2;
    const life = options.life || 400;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomFloat(0, Math.PI * 2);
      const speed = randomFloat(30, 80);

      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: randomFloat(size * 0.7, size * 1.3),
        life: randomFloat(life * 0.8, life * 1.2),
        type: "spark",
        gravity: 20,
        friction: 0.9,
      });
    }
  }

  /**
   * 치유 효과를 생성합니다
   * @param {number} x - 치유 지점 x 좌표
   * @param {number} y - 치유 지점 y 좌표
   * @param {Object} options - 치유 효과 옵션
   */
  createHealEffect(x, y, options = {}) {
    const particleCount = options.count || 12;
    const colors = options.colors || ["#44ff44", "#66ff66", "#88ff88"];
    const size = options.size || 3;
    const life = options.life || 1000;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomFloat(0, Math.PI * 2);
      const distance = randomFloat(5, 20);
      const startX = x + Math.cos(angle) * distance;
      const startY = y + Math.sin(angle) * distance;

      this.createParticle(startX, startY, {
        vx: randomFloat(-10, 10),
        vy: randomFloat(-60, -30),
        color: randomChoice(colors),
        size: randomFloat(size * 0.8, size * 1.2),
        life: randomFloat(life * 0.9, life * 1.1),
        type: "circle",
        gravity: -20,
        friction: 0.98,
      });
    }
  }

  /**
   * 연기 효과를 생성합니다
   * @param {number} x - 연기 시작 x 좌표
   * @param {number} y - 연기 시작 y 좌표
   * @param {Object} options - 연기 효과 옵션
   */
  createSmokeEffect(x, y, options = {}) {
    const particleCount = options.count || 10;
    const colors = options.colors || ["#666666", "#888888", "#aaaaaa"];
    const size = options.size || 6;
    const life = options.life || 2000;

    for (let i = 0; i < particleCount; i++) {
      this.createParticle(x + randomFloat(-10, 10), y + randomFloat(-5, 5), {
        vx: randomFloat(-20, 20),
        vy: randomFloat(-40, -20),
        color: randomChoice(colors),
        size: randomFloat(size * 0.5, size * 1.5),
        life: randomFloat(life * 0.8, life * 1.2),
        type: "circle",
        gravity: -5,
        friction: 0.99,
        scale: 1.5,
      });
    }
  }

  /**
   * 모든 파티클을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);

      if (!particle.isAlive) {
        this.particles.splice(i, 1);
        this.particlePool.release(particle);
      }
    }

    // 번개 선 업데이트
    for (let i = this.lightningLines.length - 1; i >= 0; i--) {
      const lightning = this.lightningLines[i];
      lightning.life -= deltaTime;
      lightning.alpha = lightning.life / lightning.maxLife;

      if (lightning.life <= 0) {
        this.lightningLines.splice(i, 1);
      }
    }
  }

  /**
   * 모든 파티클을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 번개 선 그리기
    for (const lightning of this.lightningLines) {
      ctx.save();
      ctx.globalAlpha = lightning.alpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#88ffff";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(lightning.startX, lightning.startY);
      ctx.lineTo(lightning.endX, lightning.endY);
      ctx.stroke();

      ctx.restore();
    }

    // 파티클 그리기
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  /**
   * 모든 파티클을 제거합니다
   */
  clear() {
    for (const particle of this.particles) {
      this.particlePool.release(particle);
    }
    this.particles = [];
  }

  /**
   * 활성 파티클 수를 반환합니다
   * @returns {number} 활성 파티클 수
   */
  getParticleCount() {
    return this.particles.length;
  }
}

/**
 * 트레일 효과 클래스 (움직이는 객체의 궤적 효과)
 */
class Trail {
  /**
   * @param {number} maxLength - 최대 트레일 길이
   * @param {string} color - 트레일 색상
   * @param {number} width - 트레일 너비
   */
  constructor(maxLength = 10, color = "#ffffff", width = 2) {
    this.points = [];
    this.maxLength = maxLength;
    this.color = color;
    this.width = width;
    this.maxSegmentLength = 35; // 선분이 너무 길면 그리지 않음 (깨진 선 방지)
    this.minDistance = 1.5; // 포인트 간 최소 거리
    this.minIntervalMs = 16; // 포인트 추가 최소 간격 (스로틀)
    this._lastAddTime = 0;
    this._lastX = null;
    this._lastY = null;
  }

  /**
   * 새로운 점을 추가합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   */
  addPoint(x, y) {
    const now = performance.now();
    // 스로틀: 너무 자주 추가하지 않음
    if (now - this._lastAddTime < this.minIntervalMs) return;

    // 최소 이동 거리 체크
    if (this._lastX !== null && this._lastY !== null) {
      const dx = x - this._lastX;
      const dy = y - this._lastY;
      const dist = Math.hypot(dx, dy);
      if (dist < this.minDistance) return;
    }

    this.points.push({ x, y, time: now });
    this._lastAddTime = now;
    this._lastX = x;
    this._lastY = y;

    if (this.points.length > this.maxLength) {
      this.points.shift();
    }
  }

  /**
   * 트레일을 업데이트합니다
   */
  update() {
    const currentTime = performance.now();
    this.points = this.points.filter((point) => currentTime - point.time < 500);
  }

  /**
   * 트레일을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 외곽 글로우 패스
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy);
      if (len > this.maxSegmentLength) continue; // 너무 긴 선은 스킵

      const t = i / this.points.length;
      const alpha = t * 0.35;
      const width = Math.max(1, this.width * t + 2);

      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // 내부 코어 패스
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy);
      if (len > this.maxSegmentLength) continue; // 너무 긴 선은 스킵

      const t = i / this.points.length;
      const alpha = t * 0.9;
      const width = Math.max(1, this.width * t);

      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 트레일을 초기화합니다
   */
  clear() {
    this.points = [];
  }
}
