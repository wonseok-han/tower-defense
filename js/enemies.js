/**
 * 적 시스템 - 3종류의 적과 경로 시스템
 * 정찰병, 기사, 드래곤을 구현하고 경로 따라가기 시스템 구현
 */

/**
 * 기본 적 클래스
 */
class Enemy extends LivingEntity {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {Object} stats - 적 스탯
   */
  constructor(x, y, stats) {
    super(x, y, stats.width || 24, stats.height || 24, stats.health || 50);

    this.stats = {
      speed: stats.speed || 50,
      goldReward: stats.goldReward || 5,
      scoreReward: stats.scoreReward || 10,
      armor: stats.armor || 0,
      magicResist: stats.magicResist || 0,
      ...stats,
    };

    // 경로 관련
    this.path = [];
    this.currentWaypoint = 0;
    this.baseSpeed = this.stats.speed;
    this.currentSpeed = this.baseSpeed;

    // 애니메이션
    this.walkCycle = 0;
    this.facingDirection = 1; // 1: 오른쪽, -1: 왼쪽

    // 체력바 설정
    this.showHealthBar = true;
    this.healthBarOffset = -18;

    this.type = "enemy";
    this.addTag("enemy");
    this.addTag("hostile");

    // 도달 시 피해량
    this.damage = stats.damage || 1;

    // 상태 효과 저항
    this.statusResistance = new Map();
  }

  /**
   * 적을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    super.update(deltaTime);

    if (!this.isAlive || this.isDead) return;

    // 속도 계산 (상태 효과 적용)
    this.updateSpeed();

    // 경로 따라가기
    this.followPath(deltaTime);

    // 애니메이션 업데이트
    this.updateWalkAnimation(deltaTime);

    // 피격 플래시 효과 업데이트
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaTime;
      this.damageFlashTime = Math.max(0, this.damageFlashTime);
    }

    // 목적지 도달 확인
    if (this.hasReachedEnd()) {
      this.onReachEnd();
    }
  }

  /**
   * 속도를 업데이트합니다 (상태 효과 고려)
   */
  updateSpeed() {
    this.currentSpeed = this.baseSpeed;

    // 둔화 효과 적용
    if (this.hasStatusEffect("slow")) {
      const slowEffect = this.statusEffects.get("slow");
      this.currentSpeed *= 1 - slowEffect.strength;
    }

    // 빙결 효과 적용
    if (this.hasStatusEffect("freeze")) {
      this.currentSpeed = 0;
    }

    // 가속 효과 적용
    if (this.hasStatusEffect("haste")) {
      const hasteEffect = this.statusEffects.get("haste");
      this.currentSpeed *= 1 + hasteEffect.strength;
    }
  }

  /**
   * 경로를 따라 이동합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  followPath(deltaTime) {
    if (this.path.length === 0 || this.currentWaypoint >= this.path.length)
      return;

    const target = this.path[this.currentWaypoint];
    const distanceToTarget = this.position.distanceTo(target);

    // 웨이포인트에 도달했으면 다음 웨이포인트로
    if (distanceToTarget < 5) {
      this.currentWaypoint++;
      return;
    }

    // 타겟을 향해 이동
    const direction = new Vector2(
      target.x - this.position.x,
      target.y - this.position.y
    );
    direction.normalize();

    // 방향 설정
    this.facingDirection = direction.x > 0 ? 1 : -1;

    // 이동
    const moveDistance = this.currentSpeed * deltaTime * 0.001;
    this.position.add(direction.multiply(moveDistance));
  }

  /**
   * 걷기 애니메이션을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  updateWalkAnimation(deltaTime) {
    if (this.currentSpeed > 0) {
      this.walkCycle +=
        deltaTime * 0.005 * (this.currentSpeed / this.baseSpeed);
      this.walkCycle = this.walkCycle % (Math.PI * 2);
    }
  }

  /**
   * 경로를 설정합니다
   * @param {Array} path - 웨이포인트 배열
   */
  setPath(path) {
    this.path = path.map((point) => new Vector2(point.x, point.y));
    this.currentWaypoint = 0;

    // 경로의 첫 번째 포인트에서 시작
    if (this.path.length > 0) {
      this.position.set(this.path[0].x, this.path[0].y);
    }
  }

  /**
   * 목적지에 도달했는지 확인합니다
   * @returns {boolean} 도달 여부
   */
  hasReachedEnd() {
    return this.currentWaypoint >= this.path.length;
  }

  /**
   * 목적지에 도달했을 때 호출됩니다
   */
  onReachEnd() {
    this.destroy();

    // 플레이어에게 피해
    if (window.game) {
      window.game.takeDamage(this.damage);
    }
  }

  /**
   * 데미지를 받을 때 호출됩니다 (피격 효과 추가)
   * @param {number} amount - 데미지 양
   * @param {string} damageType - 데미지 타입
   */
  onDamage(amount, damageType) {
    // 방어력 적용
    let finalDamage = amount;

    if (damageType === "physical" && this.stats.armor > 0) {
      finalDamage = Math.max(1, amount - this.stats.armor);
    } else if (damageType === "magic" && this.stats.magicResist > 0) {
      finalDamage = Math.max(1, amount * (1 - this.stats.magicResist));
    }

    // 피격 플래시 효과
    this.damageFlashTime = 200; // 200ms 동안 빨간색 플래시

    // 데미지 정보 저장 (체력바 및 데미지 숫자 표시용)
    this.lastDamageAmount = Math.round(finalDamage);
    this.lastDamageTime = performance.now();

    // 데미지 텍스트 표시 (기존 시스템과 병행)
    if (window.game && window.game.showDamageText) {
      window.game.showDamageText(
        this.position.x,
        this.position.y,
        Math.round(finalDamage)
      );
    }

    // 타격 사운드
    if (window.game && window.game.soundManager) {
      window.game.soundManager.playSound("enemy_hit", 0.5);
    }
  }

  /**
   * 죽을 때 호출됩니다
   */
  onDeath() {
    super.onDeath();

    // 보상 지급
    if (window.game) {
      window.game.addGold(this.stats.goldReward);
      window.game.addScore(this.stats.scoreReward);
    }

    // 죽음 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createExplosion(
        this.position.x,
        this.position.y,
        {
          count: 8,
          colors: ["#ff4444", "#ff6666", "#ff8888"],
          size: 3,
          speed: 60,
          life: 600,
        }
      );
    }

    // 죽음 사운드
    if (window.game && window.game.soundManager) {
      window.game.soundManager.playSound("enemy_death", 0.7);
    }
  }

  /**
   * 상태 효과가 적용될 때 호출됩니다
   * @param {string} type - 상태 효과 타입
   * @param {number} duration - 지속 시간
   * @param {number} strength - 강도
   */
  onStatusEffectApplied(type, duration, strength) {
    // 저항 적용
    if (this.statusResistance.has(type)) {
      const resistance = this.statusResistance.get(type);
      duration *= 1 - resistance;
      strength *= 1 - resistance;
    }

    // 시각적 효과
    switch (type) {
      case "slow":
        if (window.game && window.game.particleSystem) {
          window.game.particleSystem.createMagicEffect(
            this.position.x,
            this.position.y,
            {
              count: 5,
              colors: ["#4444ff", "#6666ff"],
              size: 2,
            }
          );
        }
        break;
      case "freeze":
        if (window.game && window.game.particleSystem) {
          window.game.particleSystem.createMagicEffect(
            this.position.x,
            this.position.y,
            {
              count: 8,
              colors: ["#aaffff", "#ccffff", "#ffffff"],
              size: 3,
            }
          );
        }
        break;
      case "burn":
        // 화상 효과 - 빨간색/주황색 파티클
        if (window.game && window.game.particleSystem) {
          window.game.particleSystem.createMagicEffect(
            this.position.x,
            this.position.y,
            {
              count: 8,
              colors: ["#ff4400", "#ff6600", "#ff8800"],
              size: 3,
            }
          );
        }
        break;
      case "stun":
        // 기절 효과 - 노란색 별 파티클
        if (window.game && window.game.particleSystem) {
          window.game.particleSystem.createMagicEffect(
            this.position.x,
            this.position.y - 10,
            {
              count: 3,
              colors: ["#ffff00", "#ffdd00"],
              size: 4,
            }
          );
        }
        break;
    }
  }

  /**
   * 적을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 상태 효과 시각적 표현
    if (this.hasStatusEffect("slow")) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#4444ff";
      ctx.beginPath();
      ctx.arc(
        this.position.x,
        this.position.y,
        this.size.x / 2 + 5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    if (this.hasStatusEffect("freeze")) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#aaffff";
      ctx.beginPath();
      ctx.arc(
        this.position.x,
        this.position.y,
        this.size.x / 2 + 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // 화상 효과 시각적 표시
    if (this.hasStatusEffect("burn")) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.arc(
        this.position.x,
        this.position.y,
        this.size.x / 2 + 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // 기절 효과 시각적 표시
    if (this.hasStatusEffect("stun")) {
      ctx.save();
      ctx.fillStyle = "#ffff00";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⭐", this.position.x, this.position.y - 15);
      ctx.restore();
    }

    super.draw(ctx);

    // 체력바 그리기 (체력이 최대가 아닐 때만)
    if (this.health < this.maxHealth && this.health > 0) {
      this.drawHealthBar(ctx);
    }

    // 데미지 숫자 표시 (최근에 피격당했을 때)
    if (this.lastDamageTime && performance.now() - this.lastDamageTime < 1000) {
      this.drawDamageNumber(ctx);
    }
  }

  /**
   * 체력바를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawHealthBar(ctx) {
    const barWidth = this.size.x + 10;
    const barHeight = 4;
    const barY = this.position.y - this.size.y / 2 - 10;

    ctx.save();

    // 체력바 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(this.position.x - barWidth / 2, barY, barWidth, barHeight);

    // 체력바 (빨간색에서 초록색으로 그라디언트)
    const healthRatio = this.health / this.maxHealth;
    const healthBarWidth = barWidth * healthRatio;

    // 체력 비율에 따른 색상 계산
    let healthColor;
    if (healthRatio > 0.6) {
      healthColor = "#00ff00"; // 초록색
    } else if (healthRatio > 0.3) {
      healthColor = "#ffff00"; // 노란색
    } else {
      healthColor = "#ff0000"; // 빨간색
    }

    ctx.fillStyle = healthColor;
    ctx.fillRect(
      this.position.x - barWidth / 2,
      barY,
      healthBarWidth,
      barHeight
    );

    // 체력바 테두리
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.position.x - barWidth / 2, barY, barWidth, barHeight);

    // 체력 숫자 (작은 폰트로)
    if (healthRatio < 0.8) {
      // 체력이 80% 미만일 때만 표시
      ctx.fillStyle = "#ffffff";
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeText(`${Math.ceil(this.health)}`, this.position.x, barY - 2);
      ctx.fillText(`${Math.ceil(this.health)}`, this.position.x, barY - 2);
    }

    ctx.restore();
  }

  /**
   * 최근 받은 데미지 숫자를 표시합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawDamageNumber(ctx) {
    if (!this.lastDamageAmount) return;

    const timeSinceDamage = performance.now() - this.lastDamageTime;
    const alpha = Math.max(0, 1 - timeSinceDamage / 1000); // 1초 동안 페이드아웃
    const offsetY = -timeSinceDamage * 0.03; // 위로 떠오르는 효과

    ctx.save();
    ctx.globalAlpha = alpha;

    // 데미지 텍스트 아웃라인
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.strokeText(
      `-${this.lastDamageAmount}`,
      this.position.x + 15,
      this.position.y - 20 + offsetY
    );

    // 데미지 텍스트
    ctx.fillStyle = "#ff4444";
    ctx.fillText(
      `-${this.lastDamageAmount}`,
      this.position.x + 15,
      this.position.y - 20 + offsetY
    );

    ctx.restore();
  }
}

/**
 * 정찰병 - 빠르지만 약한 적
 */
class Scout extends Enemy {
  constructor(x, y) {
    const stats = {
      health: 20, // 낮은 체력
      speed: 90, // 빠른 속도
      goldReward: 2, // 2 골드 보상
      scoreReward: 5,
      armor: 0,
      magicResist: 0,
      width: 20,
      height: 20,
      damage: 1,
    };

    super(x, y, stats);
    this.enemyType = "scout";
    this.addTag("light");

    // 정찰병은 마법에 약함
    this.statusResistance.set("slow", 0); // 둔화에 저항 없음
    this.statusResistance.set("freeze", 0);
  }

  /**
   * 정찰병을 렌더링합니다 (초록 고블린 스타일)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    ctx.save();
    ctx.scale(this.facingDirection, 1);

    // 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(-8, 10, 16, 4);

    // 몸체 (초록 고블린)
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    bodyGradient.addColorStop(0, "#9ACD32");
    bodyGradient.addColorStop(0.7, "#6B8E23");
    bodyGradient.addColorStop(1, "#556B2F");
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-8, -6, 16, 14);

    // 고블린 배
    ctx.fillStyle = "#8FBC8F";
    ctx.fillRect(-6, -2, 12, 8);

    // 걷기 애니메이션 (다리)
    const legOffset = Math.sin(this.walkCycle) * 3;
    const armOffset = Math.sin(this.walkCycle + Math.PI) * 1;

    // 다리 (더 만화적으로)
    ctx.fillStyle = "#6B8E23";
    ctx.fillRect(-3, 6 + legOffset, 3, 8);
    ctx.fillRect(1, 6 - legOffset, 3, 8);

    // 발
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-4, 12 + legOffset, 5, 3);
    ctx.fillRect(0, 12 - legOffset, 5, 3);

    // 팔
    ctx.fillStyle = "#9ACD32";
    ctx.fillRect(-10, -2 + armOffset, 4, 8);
    ctx.fillRect(6, -2 - armOffset, 4, 8);

    // 무기 (고블린 단검)
    ctx.save();
    ctx.translate(8, 2 - armOffset);
    ctx.rotate(0.3);

    // 칼날
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(0, -1, 12, 2);

    // 칼날 반짝임
    ctx.fillStyle = "#E6E6FA";
    ctx.fillRect(2, -0.5, 8, 1);

    // 손잡이
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(10, -2, 4, 4);

    ctx.restore();

    // 머리 (고블린 특징)
    const headGradient = ctx.createRadialGradient(0, -8, 0, 0, -8, 8);
    headGradient.addColorStop(0, "#9ACD32");
    headGradient.addColorStop(1, "#6B8E23");
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fill();

    // 고블린 귀 (뾰족한)
    ctx.fillStyle = "#9ACD32";
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(7, -10);
    ctx.lineTo(12, -12);
    ctx.lineTo(8, -6);
    ctx.closePath();
    ctx.fill();

    // 얼굴
    // 눈 (빨간 고블린 눈)
    ctx.fillStyle = "#FF4500";
    ctx.beginPath();
    ctx.arc(-2, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(-2, -9, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -9, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 코 (고블린 특징적인 큰 코)
    ctx.fillStyle = "#8FBC8F";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-1, -5);
    ctx.lineTo(1, -5);
    ctx.closePath();
    ctx.fill();

    // 입 (사악한 미소)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -5, 2, 0, Math.PI);
    ctx.stroke();

    // 이빨
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-1, -5, 1, 2);
    ctx.fillRect(0, -5, 1, 2);

    // 헬멧 (가죽 모자)
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI);
    ctx.fill();

    // 헬멧 장식
    ctx.fillStyle = "#654321";
    ctx.fillRect(-6, -12, 12, 2);

    ctx.restore();
  }
}

/**
 * 기사 - 느리지만 강한 적
 */
class Knight extends Enemy {
  constructor(x, y) {
    const stats = {
      health: 80, // 높은 체력
      speed: 35, // 느린 속도
      goldReward: 5, // 5 골드 보상
      scoreReward: 15,
      armor: 3, // 적당한 방어력
      magicResist: 0.1,
      width: 28,
      height: 28,
      damage: 2,
    };

    super(x, y, stats);
    this.enemyType = "knight";
    this.addTag("heavy");
    this.addTag("armored");

    // 기사는 물리 공격에 강하고 둔화에 어느 정도 저항
    this.statusResistance.set("slow", 0.3); // 30% 둔화 저항
    this.statusResistance.set("freeze", 0.5); // 50% 빙결 저항
  }

  /**
   * 기사를 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    ctx.save();
    ctx.scale(this.facingDirection, 1);

    // 몸체 (갑옷)
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(-10, -10, 20, 20);

    // 갑옷 디테일
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 1;
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(10, -3);
    ctx.moveTo(-10, 3);
    ctx.lineTo(10, 3);
    ctx.stroke();

    // 헬멧
    ctx.fillStyle = "#A0A0A0";
    ctx.fillRect(-8, -14, 16, 10);

    // 헬멧 장식
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-6, -16, 12, 2);

    // 걷기 애니메이션 (다리) - 더 무거운 느낌
    const legOffset = Math.sin(this.walkCycle * 0.7) * 1.5;
    ctx.fillStyle = "#696969";
    ctx.fillRect(-4, 8 + legOffset, 3, 8);
    ctx.fillRect(1, 8 - legOffset, 3, 8);

    // 방패
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-12, -6, 4, 12);
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(-10, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // 검
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(8, -8, 3, 16);
    ctx.fillRect(7, -10, 5, 4);
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(8, 6, 3, 4);

    // 얼굴 (헬멧 틈새)
    ctx.fillStyle = "#FFE4B5";
    ctx.fillRect(-3, -8, 6, 4);

    // 눈
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(-1, -6, 1, 1);
    ctx.fillRect(1, -6, 1, 1);

    ctx.restore();
  }

  /**
   * 죽을 때 호출됩니다
   */
  onDeath() {
    super.onDeath();

    // 기사는 죽을 때 더 큰 폭발 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createExplosion(
        this.position.x,
        this.position.y,
        {
          count: 15,
          colors: ["#C0C0C0", "#808080", "#A0A0A0"],
          size: 4,
          speed: 80,
          life: 800,
        }
      );
    }
  }
}

/**
 * 드래곤 - 공중 유닛으로 일부 타워에 면역
 */
class Dragon extends Enemy {
  constructor(x, y) {
    const stats = {
      health: 50, // 중간 체력
      speed: 55, // 중간 속도
      goldReward: 8, // 8 골드 보상
      scoreReward: 30,
      armor: 1, // 약간의 방어력
      magicResist: 0.3, // 마법 저항
      width: 32,
      height: 32,
      damage: 3,
    };

    super(x, y, stats);
    this.enemyType = "dragon";
    this.addTag("flying");
    this.addTag("boss");

    // 드래곤의 특수 능력
    this.wingFlap = 0;
    this.breathCooldown = 0;
    this.fireBreathRange = 60;

    // 드래곤은 모든 상태 효과에 강한 저항
    this.statusResistance.set("slow", 0.6); // 60% 둔화 저항
    this.statusResistance.set("freeze", 0.8); // 80% 빙결 저항
  }

  /**
   * 드래곤을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    super.update(deltaTime);

    // 날개 애니메이션
    this.wingFlap += deltaTime * 0.01;
    this.wingFlap = this.wingFlap % (Math.PI * 2);

    // 화염 브레스 쿨다운
    if (this.breathCooldown > 0) {
      this.breathCooldown -= deltaTime;
    }

    // 주변에 타워가 있으면 화염 브레스 공격
    if (this.breathCooldown <= 0 && window.game && window.game.towerManager) {
      this.checkFireBreath();
    }
  }

  /**
   * 화염 브레스 공격을 확인하고 실행합니다
   */
  checkFireBreath() {
    const towers = window.game.towerManager.towers;

    for (const tower of towers) {
      if (this.distanceTo(tower) <= this.fireBreathRange) {
        this.fireBreath(tower);
        this.breathCooldown = 3000; // 3초 쿨다운
        break;
      }
    }
  }

  /**
   * 화염 브레스를 발사합니다
   * @param {Tower} target - 대상 타워
   */
  fireBreath(target) {
    // 타워에 데미지 (타워가 데미지를 받을 수 있다면)
    // 현재는 시각적 효과만

    if (window.game && window.game.particleSystem) {
      // 화염 효과
      const direction = new Vector2(
        target.position.x - this.position.x,
        target.position.y - this.position.y
      );
      direction.normalize();

      for (let i = 0; i < 20; i++) {
        const distance = i * 3;
        const x = this.position.x + direction.x * distance;
        const y = this.position.y + direction.y * distance;

        setTimeout(() => {
          window.game.particleSystem.createExplosion(x, y, {
            count: 5,
            colors: ["#ff4444", "#ff8800", "#ffaa00"],
            size: 3,
            speed: 40,
            life: 400,
          });
        }, i * 50);
      }
    }
  }

  /**
   * 드래곤을 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    ctx.save();
    ctx.scale(this.facingDirection, 1);

    // 그림자 (공중 유닛임을 표시)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(0, 20, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 날개
    const wingOffset = Math.sin(this.wingFlap) * 10;
    ctx.fillStyle = "#8B0000";

    // 왼쪽 날개
    ctx.save();
    ctx.rotate(-0.3 + Math.sin(this.wingFlap) * 0.2);
    ctx.fillRect(-25, -5 + wingOffset, 20, 8);
    ctx.restore();

    // 오른쪽 날개
    ctx.save();
    ctx.rotate(0.3 - Math.sin(this.wingFlap) * 0.2);
    ctx.fillRect(5, -5 - wingOffset, 20, 8);
    ctx.restore();

    // 몸체
    ctx.fillStyle = "#DC143C";
    ctx.fillRect(-12, -8, 24, 16);

    // 비늘 디테일
    ctx.fillStyle = "#B22222";
    for (let i = -10; i < 10; i += 4) {
      for (let j = -6; j < 6; j += 3) {
        ctx.fillRect(i, j, 2, 2);
      }
    }

    // 목
    ctx.fillStyle = "#DC143C";
    ctx.fillRect(8, -4, 12, 8);

    // 머리
    ctx.fillStyle = "#B22222";
    ctx.fillRect(16, -6, 12, 12);

    // 뿔
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(20, -6);
    ctx.lineTo(18, -12);
    ctx.lineTo(22, -12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.lineTo(22, -12);
    ctx.lineTo(26, -12);
    ctx.closePath();
    ctx.fill();

    // 눈
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(20, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, -2, 2, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(20, -2, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, -2, 1, 0, Math.PI * 2);
    ctx.fill();

    // 코
    ctx.fillStyle = "#8B0000";
    ctx.fillRect(26, 0, 4, 2);

    // 꼬리
    ctx.fillStyle = "#DC143C";
    const tailSway = Math.sin(this.wingFlap * 0.5) * 5;
    ctx.save();
    ctx.rotate(Math.sin(this.wingFlap * 0.3) * 0.1);
    ctx.fillRect(-20, -2 + tailSway, 12, 4);
    ctx.fillRect(-25, -1 + tailSway, 8, 2);
    ctx.restore();

    ctx.restore();
  }

  /**
   * 죽을 때 호출됩니다
   */
  onDeath() {
    super.onDeath();

    // 드래곤은 죽을 때 화려한 폭발 효과
    if (window.game && window.game.particleSystem) {
      // 큰 폭발
      window.game.particleSystem.createExplosion(
        this.position.x,
        this.position.y,
        {
          count: 30,
          colors: ["#ff4444", "#ff8800", "#ffaa00", "#ffdd44"],
          size: 8,
          speed: 150,
          life: 1200,
        }
      );

      // 마법 효과
      setTimeout(() => {
        window.game.particleSystem.createMagicEffect(
          this.position.x,
          this.position.y,
          {
            count: 20,
            colors: ["#FFD700", "#FFA500", "#FF8C00"],
            size: 6,
            life: 1500,
          }
        );
      }, 200);
    }
  }
}

/**
 * 적 관리자 클래스
 */
class EnemyManager {
  constructor() {
    this.enemies = [];
    this.enemyPool = new Map();
    this.spawnPoint = new Vector2(-30, 210); // 새로운 맵 크기에 맞춤
    this.path = [];

    // 오브젝트 풀 초기화
    this.initializePools();
  }

  /**
   * 오브젝트 풀을 초기화합니다
   */
  initializePools() {
    this.enemyPool.set(
      "scout",
      new ObjectPool(
        () => new Scout(0, 0),
        (enemy) => this.resetEnemy(enemy),
        10
      )
    );

    this.enemyPool.set(
      "knight",
      new ObjectPool(
        () => new Knight(0, 0),
        (enemy) => this.resetEnemy(enemy),
        5
      )
    );

    this.enemyPool.set(
      "dragon",
      new ObjectPool(
        () => new Dragon(0, 0),
        (enemy) => this.resetEnemy(enemy),
        3
      )
    );
  }

  /**
   * 적을 리셋합니다 (오브젝트 풀용)
   * @param {Enemy} enemy - 리셋할 적
   */
  resetEnemy(enemy) {
    // 경로의 첫 번째 포인트에서 시작 (경로가 설정되어 있다면)
    if (this.path.length > 0) {
      enemy.position.set(this.path[0].x, this.path[0].y);
    } else {
      enemy.position.set(this.spawnPoint.x, this.spawnPoint.y);
    }

    enemy.health = enemy.maxHealth;
    enemy.isAlive = true;
    enemy.isDead = false;
    enemy.isVisible = true;
    enemy.currentWaypoint = 0;
    enemy.statusEffects.clear();
    enemy.currentSpeed = enemy.baseSpeed;
    enemy.invulnerable = false;
    enemy.damageFlashTime = 0;
  }

  /**
   * 경로를 설정합니다
   * @param {Array} path - 웨이포인트 배열
   */
  setPath(path) {
    this.path = path;
  }

  /**
   * 적을 생성합니다
   * @param {string} enemyType - 적 타입
   * @returns {Enemy} 생성된 적
   */
  spawnEnemy(enemyType) {
    const pool = this.enemyPool.get(enemyType);
    if (!pool) return null;

    const enemy = pool.get();
    enemy.setPath(this.path);
    this.enemies.push(enemy);

    return enemy;
  }

  /**
   * 적을 제거합니다
   * @param {Enemy} enemy - 제거할 적
   */
  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);

      // 오브젝트 풀로 반환
      const pool = this.enemyPool.get(enemy.enemyType);
      if (pool) {
        pool.release(enemy);
      }
    }
  }

  /**
   * 모든 적을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(deltaTime);

      // 죽었거나 목적지에 도달한 적 제거
      if (!enemy.isAlive || enemy.hasReachedEnd()) {
        this.removeEnemy(enemy);
      }
    }
  }

  /**
   * 모든 적을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
  }

  /**
   * 살아있는 적의 수를 반환합니다
   * @returns {number} 살아있는 적의 수
   */
  getAliveEnemyCount() {
    return this.enemies.filter((enemy) => enemy.isAlive).length;
  }

  /**
   * 특정 타입의 적 수를 반환합니다
   * @param {string} enemyType - 적 타입
   * @returns {number} 해당 타입의 적 수
   */
  getEnemyCountByType(enemyType) {
    return this.enemies.filter(
      (enemy) => enemy.isAlive && enemy.enemyType === enemyType
    ).length;
  }

  /**
   * 모든 적을 제거합니다
   */
  clear() {
    for (const enemy of this.enemies) {
      const pool = this.enemyPool.get(enemy.enemyType);
      if (pool) {
        pool.release(enemy);
      }
    }
    this.enemies = [];
  }

  /**
   * 가장 가까운 적을 찾습니다
   * @param {Vector2} position - 기준 위치
   * @param {number} maxDistance - 최대 거리
   * @returns {Enemy|null} 가장 가까운 적
   */
  findClosestEnemy(position, maxDistance = Infinity) {
    let closestEnemy = null;
    let closestDistance = maxDistance;

    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;

      const distance = position.distanceTo(enemy.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  }

  /**
   * 범위 내의 모든 적을 찾습니다
   * @param {Vector2} position - 중심 위치
   * @param {number} radius - 반지름
   * @returns {Array} 범위 내의 적들
   */
  findEnemiesInRange(position, radius) {
    return this.enemies.filter(
      (enemy) => enemy.isAlive && position.distanceTo(enemy.position) <= radius
    );
  }
}
