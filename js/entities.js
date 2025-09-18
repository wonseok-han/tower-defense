/**
 * 게임 엔티티 기본 클래스들
 * 모든 게임 객체의 기반이 되는 클래스들을 정의
 */

/**
 * 기본 엔티티 클래스
 */
class Entity {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} width - 너비
   * @param {number} height - 높이
   */
  constructor(x = 0, y = 0, width = 32, height = 32) {
    this.position = new Vector2(x, y);
    this.size = new Vector2(width, height);
    this.velocity = new Vector2(0, 0);
    this.rotation = 0;
    this.scale = 1;
    this.alpha = 1;
    this.isAlive = true;
    this.isVisible = true;
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = "entity";
    this.tags = new Set();

    // 바운딩 박스 (충돌 검사용)
    this.boundingBox = {
      x: x - width / 2,
      y: y - height / 2,
      width: width,
      height: height,
    };

    // 애니메이션 관련
    this.animations = new Map();
    this.currentAnimation = null;
    this.animationFrame = 0;
    this.animationTime = 0;
    this.animationSpeed = 1;
  }

  /**
   * 엔티티를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    if (!this.isAlive) return;

    // 위치 업데이트
    this.position.add(
      new Vector2(this.velocity.x * deltaTime, this.velocity.y * deltaTime)
    );

    // 바운딩 박스 업데이트
    this.updateBoundingBox();

    // 애니메이션 업데이트
    this.updateAnimation(deltaTime);
  }

  /**
   * 엔티티를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    if (!this.isVisible || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    this.render(ctx);

    ctx.restore();
  }

  /**
   * 실제 렌더링을 수행합니다 (하위 클래스에서 구현)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    // 기본 사각형 렌더링
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
  }

  /**
   * 바운딩 박스를 업데이트합니다
   */
  updateBoundingBox() {
    this.boundingBox.x = this.position.x - this.size.x / 2;
    this.boundingBox.y = this.position.y - this.size.y / 2;
    this.boundingBox.width = this.size.x;
    this.boundingBox.height = this.size.y;
  }

  /**
   * 애니메이션을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  updateAnimation(deltaTime) {
    if (!this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return;

    this.animationTime += deltaTime * this.animationSpeed;

    if (this.animationTime >= animation.frameTime) {
      this.animationTime = 0;
      this.animationFrame++;

      if (this.animationFrame >= animation.frames.length) {
        if (animation.loop) {
          this.animationFrame = 0;
        } else {
          this.animationFrame = animation.frames.length - 1;
          this.currentAnimation = null;
        }
      }
    }
  }

  /**
   * 애니메이션을 추가합니다
   * @param {string} name - 애니메이션 이름
   * @param {Array} frames - 프레임 배열
   * @param {number} frameTime - 프레임당 시간 (밀리초)
   * @param {boolean} loop - 반복 여부
   */
  addAnimation(name, frames, frameTime = 100, loop = true) {
    this.animations.set(name, {
      frames: frames,
      frameTime: frameTime,
      loop: loop,
    });
  }

  /**
   * 애니메이션을 재생합니다
   * @param {string} name - 애니메이션 이름
   * @param {boolean} restart - 강제 재시작 여부
   */
  playAnimation(name, restart = false) {
    if (this.currentAnimation === name && !restart) return;

    this.currentAnimation = name;
    this.animationFrame = 0;
    this.animationTime = 0;
  }

  /**
   * 다른 엔티티와의 충돌을 검사합니다
   * @param {Entity} other - 대상 엔티티
   * @returns {boolean} 충돌 여부
   */
  collidesWith(other) {
    return (
      this.boundingBox.x < other.boundingBox.x + other.boundingBox.width &&
      this.boundingBox.x + this.boundingBox.width > other.boundingBox.x &&
      this.boundingBox.y < other.boundingBox.y + other.boundingBox.height &&
      this.boundingBox.y + this.boundingBox.height > other.boundingBox.y
    );
  }

  /**
   * 점과의 충돌을 검사합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   * @returns {boolean} 충돌 여부
   */
  containsPoint(x, y) {
    return (
      x >= this.boundingBox.x &&
      x <= this.boundingBox.x + this.boundingBox.width &&
      y >= this.boundingBox.y &&
      y <= this.boundingBox.y + this.boundingBox.height
    );
  }

  /**
   * 원형 충돌을 검사합니다
   * @param {number} x - 중심 x 좌표
   * @param {number} y - 중심 y 좌표
   * @param {number} radius - 반지름
   * @returns {boolean} 충돌 여부
   */
  collidesWithCircle(x, y, radius) {
    const distanceX = this.position.x - x;
    const distanceY = this.position.y - y;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    const entityRadius = Math.max(this.size.x, this.size.y) / 2;

    return distance < radius + entityRadius;
  }

  /**
   * 태그를 추가합니다
   * @param {string} tag - 추가할 태그
   */
  addTag(tag) {
    this.tags.add(tag);
  }

  /**
   * 태그를 제거합니다
   * @param {string} tag - 제거할 태그
   */
  removeTag(tag) {
    this.tags.delete(tag);
  }

  /**
   * 태그를 확인합니다
   * @param {string} tag - 확인할 태그
   * @returns {boolean} 태그 존재 여부
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }

  /**
   * 엔티티를 파괴합니다
   */
  destroy() {
    this.isAlive = false;
    this.isVisible = false;
  }

  /**
   * 다른 엔티티와의 거리를 계산합니다
   * @param {Entity} other - 대상 엔티티
   * @returns {number} 거리
   */
  distanceTo(other) {
    return this.position.distanceTo(other.position);
  }

  /**
   * 다른 엔티티를 향하는 각도를 계산합니다
   * @param {Entity} other - 대상 엔티티
   * @returns {number} 각도 (라디안)
   */
  angleTo(other) {
    return angle(
      this.position.x,
      this.position.y,
      other.position.x,
      other.position.y
    );
  }

  /**
   * 대상을 향해 이동합니다
   * @param {Vector2} target - 목표 위치
   * @param {number} speed - 이동 속도
   * @param {number} deltaTime - 프레임 간 시간차
   */
  moveToward(target, speed, deltaTime) {
    const direction = new Vector2(
      target.x - this.position.x,
      target.y - this.position.y
    );
    direction.normalize();
    direction.multiply(speed * deltaTime);

    this.position.add(direction);
  }
}

/**
 * 살아있는 엔티티 클래스 (체력이 있는 객체)
 */
class LivingEntity extends Entity {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} width - 너비
   * @param {number} height - 높이
   * @param {number} maxHealth - 최대 체력
   */
  constructor(x, y, width, height, maxHealth = 100) {
    super(x, y, width, height);

    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.isDead = false;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;
    this.damageFlashTime = 0;
    this.lastDamageTime = 0;

    // 상태 효과
    this.statusEffects = new Map();

    // 체력바 표시 관련
    this.showHealthBar = false;
    this.healthBarWidth = 30;
    this.healthBarHeight = 4;
    this.healthBarOffset = -20;
  }

  /**
   * 엔티티를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    super.update(deltaTime);

    // 무적 시간 처리
    if (this.invulnerable && this.invulnerabilityTime > 0) {
      this.invulnerabilityTime -= deltaTime;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
      }
    }

    // 데미지 플래시 효과
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaTime;
    }

    // 상태 효과 업데이트
    this.updateStatusEffects(deltaTime);

    // 죽음 처리
    if (this.health <= 0 && !this.isDead) {
      this.onDeath();
    }
  }

  /**
   * 엔티티를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 데미지 플래시 효과
    if (this.damageFlashTime > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.5;
    }

    super.draw(ctx);

    if (this.damageFlashTime > 0) {
      ctx.restore();
    }

    // 체력바 그리기
    if (this.showHealthBar && this.health < this.maxHealth) {
      this.drawHealthBar(ctx);
    }
  }

  /**
   * 체력바를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawHealthBar(ctx) {
    const healthRatio = this.health / this.maxHealth;
    const barX = this.position.x - this.healthBarWidth / 2;
    const barY = this.position.y + this.healthBarOffset;

    ctx.save();

    // 배경
    ctx.fillStyle = "#333333";
    ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

    // 체력
    ctx.fillStyle =
      healthRatio > 0.5
        ? "#44ff44"
        : healthRatio > 0.25
        ? "#ffff44"
        : "#ff4444";
    ctx.fillRect(
      barX,
      barY,
      this.healthBarWidth * healthRatio,
      this.healthBarHeight
    );

    // 테두리
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

    ctx.restore();
  }

  /**
   * 데미지를 받습니다
   * @param {number} amount - 데미지 양
   * @param {string} damageType - 데미지 타입
   * @returns {boolean} 데미지를 받았는지 여부
   */
  takeDamage(amount, damageType = "normal") {
    if (this.invulnerable || this.isDead) return false;

    this.health = Math.max(0, this.health - amount);
    this.lastDamageTime = performance.now();
    this.damageFlashTime = 200; // 200ms 동안 플래시

    // 무적 시간 적용 (연속 데미지 방지)
    this.invulnerable = true;
    this.invulnerabilityTime = 100; // 100ms 무적

    this.onDamage(amount, damageType);

    return true;
  }

  /**
   * 체력을 회복합니다
   * @param {number} amount - 회복량
   */
  heal(amount) {
    if (this.isDead) return;

    this.health = Math.min(this.maxHealth, this.health + amount);
    this.onHeal(amount);
  }

  /**
   * 상태 효과를 적용합니다
   * @param {string} type - 상태 효과 타입
   * @param {number} duration - 지속 시간
   * @param {number} strength - 강도
   */
  applyStatusEffect(type, duration, strength = 1) {
    this.statusEffects.set(type, {
      duration: duration,
      strength: strength,
      startTime: performance.now(),
    });

    this.onStatusEffectApplied(type, duration, strength);
  }

  /**
   * 상태 효과를 제거합니다
   * @param {string} type - 제거할 상태 효과 타입
   */
  removeStatusEffect(type) {
    if (this.statusEffects.has(type)) {
      this.statusEffects.delete(type);
      this.onStatusEffectRemoved(type);
    }
  }

  /**
   * 상태 효과를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  updateStatusEffects(deltaTime) {
    for (const [type, effect] of this.statusEffects.entries()) {
      effect.duration -= deltaTime;

      if (effect.duration <= 0) {
        this.removeStatusEffect(type);
      } else {
        this.onStatusEffectUpdate(type, effect, deltaTime);
      }
    }
  }

  /**
   * 상태 효과 확인
   * @param {string} type - 확인할 상태 효과 타입
   * @returns {boolean} 상태 효과 존재 여부
   */
  hasStatusEffect(type) {
    return this.statusEffects.has(type);
  }

  /**
   * 데미지를 받을 때 호출되는 이벤트
   * @param {number} amount - 데미지 양
   * @param {string} damageType - 데미지 타입
   */
  onDamage(amount, damageType) {
    // 하위 클래스에서 구현
  }

  /**
   * 치유를 받을 때 호출되는 이벤트
   * @param {number} amount - 치유량
   */
  onHeal(amount) {
    // 하위 클래스에서 구현
  }

  /**
   * 죽을 때 호출되는 이벤트
   */
  onDeath() {
    this.isDead = true;
    this.isAlive = false;
    // 하위 클래스에서 구현
  }

  /**
   * 상태 효과가 적용될 때 호출되는 이벤트
   * @param {string} type - 상태 효과 타입
   * @param {number} duration - 지속 시간
   * @param {number} strength - 강도
   */
  onStatusEffectApplied(type, duration, strength) {
    // 하위 클래스에서 구현
  }

  /**
   * 상태 효과가 제거될 때 호출되는 이벤트
   * @param {string} type - 상태 효과 타입
   */
  onStatusEffectRemoved(type) {
    // 하위 클래스에서 구현
  }

  /**
   * 상태 효과가 업데이트될 때 호출되는 이벤트
   * @param {string} type - 상태 효과 타입
   * @param {Object} effect - 효과 객체
   * @param {number} deltaTime - 프레임 간 시간차
   */
  onStatusEffectUpdate(type, effect, deltaTime) {
    // 하위 클래스에서 구현
  }
}

/**
 * 발사체 클래스
 */
class Projectile extends Entity {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} targetX - 목표 x 좌표
   * @param {number} targetY - 목표 y 좌표
   * @param {number} speed - 이동 속도
   * @param {number} damage - 데미지
   */
  constructor(x, y, targetX, targetY, speed, damage) {
    super(x, y, 8, 8);

    this.target = new Vector2(targetX, targetY);
    this.speed = speed;
    this.damage = damage;
    this.trail = new Trail(6, "#ffaa0040", 1); // 더 투명하고 얇게
    this.hasHit = false;
    this.trailDelay = 50; // 50ms 후부터 트레일 시작

    // 이동 방향 계산
    const direction = new Vector2(targetX - x, targetY - y);
    direction.normalize();
    this.velocity = direction.multiply(speed * 0.001); // 밀리초 단위로 변환

    // 회전 설정
    this.rotation = angle(x, y, targetX, targetY);

    this.type = "projectile";
    this.addTag("projectile");
  }

  /**
   * 발사체를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    super.update(deltaTime);

    // 트레일 업데이트 (약간의 지연 후 시작)
    if (this.trailDelay > 0) {
      this.trailDelay -= deltaTime;
    } else {
      this.trail.addPoint(this.position.x, this.position.y);
    }
    this.trail.update();

    // 목표 도달 확인
    if (this.position.distanceTo(this.target) < 10 || this.hasHit) {
      this.onHit();
    }

    // 화면 밖으로 나가면 제거 (15x10 격자 경계)
    if (
      this.position.x < -50 ||
      this.position.x > 950 || // 900 + 50 여유
      this.position.y < -50 ||
      this.position.y > 650 // 600 + 50 여유
    ) {
      this.destroy();
    }
  }

  /**
   * 발사체를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 트레일 먼저 그리기
    this.trail.draw(ctx);

    super.draw(ctx);
  }

  /**
   * 발사체를 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(0, 0, this.size.x / 2, 0, Math.PI * 2);
    ctx.fill();

    // 발광 효과
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * 적중했을 때 호출되는 이벤트
   */
  onHit() {
    this.hasHit = true;
    this.trail.clear(); // 트레일 정리
    this.destroy();
    // 하위 클래스에서 구체적인 효과 구현
  }
}
