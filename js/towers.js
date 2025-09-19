/**
 * 타워 시스템 - 3종류의 타워와 관련 기능들
 * 궁수 타워, 대포 타워, 마법 타워를 구현
 */

/**
 * 기본 타워 클래스
 */
class Tower extends Entity {
  /**
   * @param {number} x - 타워 x 좌표
   * @param {number} y - 타워 y 좌표
   * @param {Object} stats - 타워 스탯
   */
  constructor(x, y, stats) {
    super(x, y, 25, 25);

    this.stats = {
      damage: stats.damage || 10,
      range: stats.range || 80,
      attackSpeed: stats.attackSpeed || 1.0, // 초당 공격 횟수
      cost: stats.cost || 20,
      upgradeCost: stats.upgradeCost || 30,
      sellValue: stats.sellValue || 15,
      ...stats,
    };

    this.level = 1;
    this.maxLevel = 3;
    this.target = null;
    this.lastAttackTime = 0;
    this.attackCooldown = 1000 / this.stats.attackSpeed; // 밀리초

    // 사정거리 표시
    this.showRange = false;
    this.rangeAlpha = 0;

    // 타워 상태
    this.isSelected = false;
    this.canAttack = true;

    this.type = "tower";
    this.addTag("tower");
    this.addTag("friendly");

    // 동시 존재 가능한 투사체 상한 (하위 클래스에서 조정)
    this.maxProjectiles = 8;
  }

  /**
   * 타워를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   * @param {Array} enemies - 적 배열
   */
  update(deltaTime, enemies) {
    super.update(deltaTime);

    // 사정거리 표시 애니메이션
    if (this.showRange && this.rangeAlpha < 1) {
      this.rangeAlpha = Math.min(1, this.rangeAlpha + deltaTime * 0.003);
    } else if (!this.showRange && this.rangeAlpha > 0) {
      this.rangeAlpha = Math.max(0, this.rangeAlpha - deltaTime * 0.003);
    }

    if (!this.canAttack) return;

    // 타겟 유효성 검사 (매우 관대하게)
    if (
      this.target &&
      (!this.target.isAlive ||
        this.distanceTo(this.target) > this.stats.range * 2.0)
    ) {
      this.target = null;
    }

    // 타겟 찾기
    this.findTarget(enemies);

    // 공격 처리
    if (this.target && this.canAttackTarget()) {
      const currentTime = performance.now();
      if (currentTime - this.lastAttackTime >= this.attackCooldown) {
        this.attack();
        this.lastAttackTime = currentTime;
      }
    }
  }

  /**
   * 타워를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 사정거리 표시
    if (this.rangeAlpha > 0) {
      this.drawRange(ctx);
    }

    super.draw(ctx);

    // 선택 표시
    if (this.isSelected) {
      this.drawSelection(ctx);
    }

    // 레벨 표시
    this.drawLevel(ctx);
  }

  /**
   * 사정거리를 그립니다 (개선된 시각적 효과)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawRange(ctx) {
    ctx.save();

    // 타워 타입별 색상 설정
    let rangeColor = "#44ff44";
    if (this.towerType === "archer") rangeColor = "#00ff88";
    else if (this.towerType === "cannon") rangeColor = "#ff8800";
    else if (this.towerType === "magic") rangeColor = "#8844ff";

    // 외곽 링 (더 진한 색상)
    ctx.globalAlpha = this.rangeAlpha * 0.6;
    ctx.strokeStyle = rangeColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.stats.range, 0, Math.PI * 2);
    ctx.stroke();

    // 내부 채우기 (투명한 색상)
    ctx.globalAlpha = this.rangeAlpha * 0.15;
    ctx.fillStyle = rangeColor;
    ctx.fill();

    // 중간 링 (점선)
    ctx.globalAlpha = this.rangeAlpha * 0.4;
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      this.position.x,
      this.position.y,
      this.stats.range * 0.7,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // 범위 표시 텍스트
    if (this.rangeAlpha > 0.5) {
      ctx.globalAlpha = this.rangeAlpha;
      ctx.fillStyle = rangeColor;
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        `${Math.round(this.stats.range)}`,
        this.position.x,
        this.position.y + this.stats.range + 15
      );
    }

    ctx.restore();
  }

  /**
   * 선택 표시를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawSelection(ctx) {
    ctx.save();
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      this.position.x - this.size.x / 2 - 2,
      this.position.y - this.size.y / 2 - 2,
      this.size.x + 4,
      this.size.y + 4
    );
    ctx.restore();
  }

  /**
   * 레벨을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawLevel(ctx) {
    if (this.level <= 1) return;

    ctx.save();
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      this.level.toString(),
      this.position.x + this.size.x / 2 - 6,
      this.position.y - this.size.y / 2 + 4
    );
    ctx.restore();
  }

  /**
   * 타겟을 찾습니다
   * @param {Array} enemies - 적 배열
   */
  findTarget(enemies) {
    if (
      this.target &&
      this.target.isAlive &&
      this.distanceTo(this.target) <= this.stats.range * 2.0
    ) {
      return this.target; // 현재 타겟이 유효하면 유지 (매우 관대하게)
    }

    let closestEnemy = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const distance = this.distanceTo(enemy);
      if (distance <= this.stats.range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    this.target = closestEnemy;
    return closestEnemy;
  }

  /**
   * 타겟을 공격할 수 있는지 확인합니다
   * @returns {boolean} 공격 가능 여부
   */
  canAttackTarget() {
    return (
      this.target &&
      this.target.isAlive &&
      this.distanceTo(this.target) <= this.stats.range * 1.5
    );
  }

  /**
   * 공격을 수행합니다 (하위 클래스에서 구현)
   */
  attack() {
    // 하위 클래스에서 구현
  }

  /**
   * 타워를 업그레이드합니다
   * @returns {boolean} 업그레이드 성공 여부
   */
  upgrade() {
    if (this.level >= this.maxLevel) return false;

    this.level++;

    // 레벨별 차등 스탯 증가
    const upgradeMultiplier = this.level === 2 ? 1.3 : 1.5; // 2레벨: 30%, 3레벨: 50% 증가

    this.stats.damage = Math.round(this.stats.damage * upgradeMultiplier);
    this.stats.range = Math.round(
      this.stats.range * (1 + (upgradeMultiplier - 1) * 0.5)
    ); // 범위는 절반만 증가
    this.stats.attackSpeed =
      this.stats.attackSpeed * (1 + (upgradeMultiplier - 1) * 0.8); // 공속은 80% 증가
    this.attackCooldown = 1000 / this.stats.attackSpeed;

    // 특수 능력 업그레이드
    this.upgradeSpecialAbilities();

    // 비용 업데이트
    this.stats.upgradeCost = Math.round(this.stats.upgradeCost * 1.6);
    this.stats.sellValue = Math.round(this.stats.sellValue * 1.4);

    // 업그레이드 시각 효과
    this.showUpgradeEffect();

    this.onUpgrade();

    return true;
  }

  /**
   * 특수 능력을 업그레이드합니다 (하위 클래스에서 오버라이드)
   */
  upgradeSpecialAbilities() {
    // 기본적으로는 아무것도 하지 않음
    // 각 타워 타입에서 오버라이드하여 구현
  }

  /**
   * 업그레이드 시각 효과를 표시합니다
   */
  showUpgradeEffect() {
    if (window.game && window.game.particleSystem) {
      // 황금색 업그레이드 파티클 효과
      window.game.particleSystem.createMagicEffect(
        this.position.x,
        this.position.y,
        {
          count: 20,
          colors: ["#FFD700", "#FFA500", "#FFFF00"],
          size: 4,
          spread: 50,
          life: 1000,
        }
      );
    }

    // 업그레이드 사운드
    if (window.game && window.game.soundManager) {
      window.game.soundManager.playSound("tower_upgrade");
    }
  }

  /**
   * 업그레이드 시 호출되는 이벤트
   */
  onUpgrade() {
    // 하위 클래스에서 구현
  }

  /**
   * 타워 판매 가격을 반환합니다
   * @returns {number} 판매 가격
   */
  getSellValue() {
    return this.stats.sellValue;
  }

  /**
   * 업그레이드 비용을 반환합니다
   * @returns {number} 업그레이드 비용
   */
  getUpgradeCost() {
    return this.level >= this.maxLevel ? 0 : this.stats.upgradeCost;
  }

  /**
   * 타워 정보를 반환합니다
   * @returns {Object} 타워 정보
   */
  getInfo() {
    return {
      type: this.constructor.name,
      level: this.level,
      maxLevel: this.maxLevel,
      damage: this.stats.damage,
      range: this.stats.range,
      attackSpeed: this.stats.attackSpeed.toFixed(2),
      upgradeCost: this.getUpgradeCost(),
      sellValue: this.getSellValue(),
    };
  }
}

/**
 * 궁수 타워 - 빠른 공격속도의 단일 타겟 타워
 */
class ArcherTower extends Tower {
  constructor(x, y) {
    const stats = {
      damage: 12,
      range: 85,
      attackSpeed: 2.5, // 더 빠른 공격
      cost: 10, // 저렴한 가격
      upgradeCost: 15,
      sellValue: 8,
    };

    super(x, y, stats);
    this.towerType = "archer";
    this.projectiles = [];

    // 업그레이드 능력
    this.piercingShots = 0; // 관통 능력
    this.multiShot = 1; // 멀티샷 개수
  }

  /**
   * 궁수 타워 특수 능력 업그레이드
   */
  upgradeSpecialAbilities() {
    if (this.level === 2) {
      // 레벨 2: 관통 화살 (화살이 적을 2번 관통)
      this.piercingShots = 2;
    } else if (this.level === 3) {
      // 레벨 3: 멀티샷 (3발 동시 발사) + 더 강한 관통
      this.multiShot = 3;
      this.piercingShots = 3;
    }
  }

  /**
   * 궁수 타워를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   * @param {Array} enemies - 적 배열
   */
  update(deltaTime, enemies) {
    super.update(deltaTime, enemies);

    // 화살 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime);

      if (!projectile.isAlive) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * 궁수 타워를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 사정거리 표시
    if (this.rangeAlpha > 0) {
      this.drawRange(ctx);
    }

    // 타워 본체 그리기
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    this.render(ctx);
    ctx.restore();

    // 선택 표시
    if (this.isSelected) {
      this.drawSelection(ctx);
    }

    // 레벨 표시
    this.drawLevel(ctx);

    // 화살 그리기
    for (const projectile of this.projectiles) {
      projectile.draw(ctx);
    }
  }

  /**
   * 궁수 타워를 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    const levelScale = 1 + (this.level - 1) * 0.1; // 레벨에 따른 크기 증가

    ctx.save();
    ctx.scale(levelScale, levelScale);

    // 타워 그림자 (중앙 기준)
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 타워 베이스 (돌 기반) - 중앙 기준
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12.5);
    gradient.addColorStop(0, "#D2B48C");
    gradient.addColorStop(0.7, "#8B7355");
    gradient.addColorStop(1, "#654321");
    ctx.fillStyle = gradient;
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 돌 텍스처
    ctx.strokeStyle = "#5D4E37";
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i += 5) {
      for (let j = -8; j <= 8; j += 5) {
        ctx.strokeRect(i, j, 4, 4);
      }
    }

    // 타워 상부 (나무 플랫폼)
    const woodGradient = ctx.createLinearGradient(-10, -10, 10, 10);
    woodGradient.addColorStop(0, "#DEB887");
    woodGradient.addColorStop(0.5, "#CD853F");
    woodGradient.addColorStop(1, "#8B4513");
    ctx.fillStyle = woodGradient;
    ctx.fillRect(-10, -9, 20, 6);

    // 나무 텍스처 라인
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(8, -9);
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.stroke();

    // 궁수 (더 디테일한 디자인) - 25x25 크기에 맞게 조정
    // 궁수 몸체
    ctx.fillStyle = "#228B22";
    ctx.fillRect(-2.5, -6, 5, 6);

    // 궁수 머리
    ctx.fillStyle = "#FFE4B5";
    ctx.beginPath();
    ctx.arc(0, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 궁수 모자
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(0, -10, 3, 0, Math.PI);
    ctx.fill();

    // 활
    if (this.target) {
      const angle = this.angleTo(this.target);
      ctx.save();
      ctx.rotate(angle);

      // 활 그리기 - 25x25 크기에 맞게 조정
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(5, 0, 3, -Math.PI / 3, Math.PI / 3, false);
      ctx.stroke();

      // 활시위
      ctx.strokeStyle = "#F5DEB3";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, -1.5);
      ctx.lineTo(3, 1.5);
      ctx.stroke();

      ctx.restore();
    }

    // 레벨에 따른 장식
    if (this.level >= 2) {
      // 깃발
      ctx.fillStyle = "#FF6347";
      ctx.fillRect(-2, -18, 4, 6);
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -18);
      ctx.lineTo(-2, -6);
      ctx.stroke();
    }

    if (this.level >= 3) {
      // 황금 테두리
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -16, 32, 32);

      // 별 장식
      this.drawStar(ctx, -12, -12, 3, "#FFD700");
      this.drawStar(ctx, 12, -12, 3, "#FFD700");
    }

    ctx.restore();
  }

  /**
   * 별을 그립니다
   */
  drawStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const radius = i % 2 === 0 ? size : size / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * 화살을 발사합니다 (업그레이드된 능력 포함)
   */
  attack() {
    if (!this.target) return;

    // 멀티샷 비활성화(요청사항: 한 발당 하나의 적)
    const shotCount = 1;
    const angleSpread = 0;

    for (let i = 0; i < shotCount; i++) {
      let targetX = this.target.position.x;
      let targetY = this.target.position.y;

      // 멀티샷일 때 각도 조정
      if (shotCount > 1) {
        const angle =
          this.angleTo(this.target) +
          (i - Math.floor(shotCount / 2)) * (angleSpread / (shotCount - 1));
        const distance = this.distanceTo(this.target);
        targetX = this.position.x + Math.cos(angle) * distance;
        targetY = this.position.y + Math.sin(angle) * distance;
      }

      const arrow = new ArrowProjectile(
        this.position.x,
        this.position.y,
        targetX,
        targetY,
        400, // 속도
        this.stats.damage,
        this.target
      );

      // 관통 능력 추가
      if (this.piercingShots > 0) {
        arrow.piercingCount = this.piercingShots;
        arrow.piercedEnemies = new Set(); // 이미 관통한 적들 추적
      }

      // 투사체 상한 관리: 초과 시 가장 오래된 것 제거
      if (this.projectiles.length >= this.maxProjectiles) {
        this.projectiles.shift();
      }
      this.projectiles.push(arrow);
    }

    // 공격 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createHitEffect(
        this.position.x,
        this.position.y,
        {
          count: 3,
          color: "#ffaa00",
          size: 2,
        }
      );
    }

    // 사운드 효과
    if (window.game && window.game.soundManager) {
      window.game.soundManager.playSound("shoot_arrow");
    }
  }

  /**
   * 업그레이드 시 호출되는 이벤트
   */
  onUpgrade() {
    // 파티클 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createMagicEffect(
        this.position.x,
        this.position.y,
        {
          count: 10,
          colors: ["#00ff00", "#44ff44", "#88ff88"],
          size: 4,
        }
      );
    }
  }
}

/**
 * 화살 발사체
 */
class ArrowProjectile extends Projectile {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} targetX - 목표 x 좌표
   * @param {number} targetY - 목표 y 좌표
   * @param {number} speed - 이동 속도
   * @param {number} damage - 데미지
   * @param {Entity} targetEntity - 타겟 엔티티
   */
  constructor(x, y, targetX, targetY, speed, damage, targetEntity) {
    super(x, y, targetX, targetY, speed, damage);
    this.targetEntity = targetEntity;
    // 트레일을 더 밝고 굵게 하여 가시성 강화
    this.trail = new Trail(8, "#FFEE8855", 1.2);
  }

  /**
   * 화살을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    // 유도 기능 제거: 발사 시 설정된 속도로 직선 비행
    super.update(deltaTime);

    // 타겟과의 충돌 검사 (직선 진행 중 일정 반경 이내면 적중)
    if (this.targetEntity && this.targetEntity.isAlive) {
      if (this.distanceTo(this.targetEntity) < 10) {
        this.onHit();
      }
    } else {
      // 타겟이 사망했으면 트레일 정리 후 제거
      this.onHit();
    }
  }

  /**
   * 화살을 렌더링합니다 (개선된 디테일)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    // 발광 테두리로 화살 가시성 강화
    ctx.save();
    ctx.shadowColor = "#FFD54A";
    ctx.shadowBlur = 12;

    // 화살 몸체 (굵기 증가)
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-10, -1.5, 20, 3);

    // 화살촉 (더 큰 금속 팁)
    ctx.fillStyle = "#E0E0E0";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(5, -3);
    ctx.lineTo(5, 3);
    ctx.closePath();
    ctx.fill();

    // 깃털 (면적 확대, 컬러 선명도 증가)
    ctx.fillStyle = "#31C553";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-6, -3);
    ctx.lineTo(-4, -1.2);
    ctx.lineTo(-4, 1.2);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * 화살이 적중했을 때
   */
  onHit() {
    if (this.targetEntity && this.targetEntity.isAlive) {
      this.targetEntity.takeDamage(this.damage, "physical");

      // 타격 효과
      if (window.game && window.game.particleSystem) {
        window.game.particleSystem.createHitEffect(
          this.position.x,
          this.position.y,
          {
            count: 5,
            color: "#ffaa00",
            size: 3,
          }
        );
      }
    }

    super.onHit();
  }
}

/**
 * 대포 타워 - 범위 공격이 가능한 강력한 타워
 */
class CannonTower extends Tower {
  constructor(x, y) {
    const stats = {
      damage: 25,
      range: 130, // 사거리 증가 (기존 95에서 130으로)
      attackSpeed: 0.4, // 매우 느린 공격 (기존 0.6에서 0.4로)
      cost: 25, // 중간 가격
      upgradeCost: 40,
      sellValue: 20,
      explosionRadius: 80, // 폭발 반지름 대폭 증가 (45에서 80으로)
    };

    super(x, y, stats);
    this.towerType = "cannon";
    this.projectiles = [];
    this.barrelRotation = 0;

    // 업그레이드 능력
    this.explosionRadius = stats.explosionRadius;
    this.stunChance = 0; // 기절 확률
    this.burnDamage = 0; // 화상 데미지
  }

  /**
   * 대포 타워 특수 능력 업그레이드
   */
  upgradeSpecialAbilities() {
    if (this.level === 2) {
      // 레벨 2: 확장된 폭발 범위 + 기절 효과
      this.explosionRadius += 20;
      this.stunChance = 0.3; // 30% 확률로 0.5초 기절
    } else if (this.level === 3) {
      // 레벨 3: 화상 효과 + 더 큰 폭발
      this.explosionRadius += 30;
      this.stunChance = 0.5; // 50% 확률로 0.8초 기절
      this.burnDamage = Math.round(this.stats.damage * 0.2); // 데미지의 20%를 3초간 화상
    }
  }

  /**
   * 대포 타워를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   * @param {Array} enemies - 적 배열
   */
  update(deltaTime, enemies) {
    super.update(deltaTime, enemies);

    // 포신 회전
    if (this.target) {
      const targetAngle = this.angleTo(this.target);
      this.barrelRotation = targetAngle;
    }

    // 포탄 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime);

      if (!projectile.isAlive) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * 대포 타워를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 사정거리 표시
    if (this.rangeAlpha > 0) {
      this.drawRange(ctx);
    }

    // 타워 본체 그리기
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    this.render(ctx);
    ctx.restore();

    // 선택 표시
    if (this.isSelected) {
      this.drawSelection(ctx);
    }

    // 레벨 표시
    this.drawLevel(ctx);

    // 포탄 그리기
    for (const projectile of this.projectiles) {
      projectile.draw(ctx);
    }
  }

  /**
   * 대포 타워를 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    const levelScale = 1 + (this.level - 1) * 0.1;

    ctx.save();
    ctx.scale(levelScale, levelScale);

    // 타워 그림자 - 중앙 기준
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 타워 베이스 (돌 요새) - 중앙 기준
    const stoneGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12.5);
    stoneGradient.addColorStop(0, "#A9A9A9");
    stoneGradient.addColorStop(0.6, "#696969");
    stoneGradient.addColorStop(1, "#2F2F2F");
    ctx.fillStyle = stoneGradient;
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 돌 블록 텍스처 - 격자에 맞게 크기 조정
    ctx.strokeStyle = "#4A4A4A";
    ctx.lineWidth = 2;
    const blockSize = 8;
    for (let i = -20; i <= 20; i += blockSize) {
      for (let j = -16; j <= 16; j += blockSize) {
        if ((i + j) % (blockSize * 2) === 0) {
          ctx.strokeRect(i, j, blockSize, blockSize);
        }
      }
    }

    // 타워 상단 플랫폼 - 격자에 맞게 크기 조정
    const metalGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
    metalGradient.addColorStop(0, "#C0C0C0");
    metalGradient.addColorStop(0.7, "#808080");
    metalGradient.addColorStop(1, "#4A4A4A");
    ctx.fillStyle = metalGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // 금속 테두리
    ctx.strokeStyle = "#2F2F2F";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 포신
    ctx.save();
    ctx.rotate(this.barrelRotation);

    // 포신 그림자 - 격자에 맞게 크기 조정
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(3, -3, 30, 8);

    // 포신 메인
    const barrelGradient = ctx.createLinearGradient(0, -5, 0, 5);
    barrelGradient.addColorStop(0, "#4A4A4A");
    barrelGradient.addColorStop(0.5, "#2F4F4F");
    barrelGradient.addColorStop(1, "#1C1C1C");
    ctx.fillStyle = barrelGradient;
    ctx.fillRect(0, -5, 30, 10);

    // 포신 끝부분
    ctx.fillStyle = "#000000";
    ctx.fillRect(20, -5, 4, 10);

    // 포신 밴드
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(8, 4);
    ctx.moveTo(16, -4);
    ctx.lineTo(16, 4);
    ctx.stroke();

    ctx.restore();

    // 대포 바퀴들
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(-10, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // 바퀴 스포크
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    [-10, 10].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x, 18);
      ctx.moveTo(x - 6, 12);
      ctx.lineTo(x + 6, 12);
      ctx.stroke();
    });

    // 레벨에 따른 장식
    if (this.level >= 2) {
      // 깃발
      ctx.fillStyle = "#8B0000";
      ctx.fillRect(-1, -25, 8, 6);
      ctx.strokeStyle = "#2F2F2F";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1, -25);
      ctx.lineTo(-1, -10);
      ctx.stroke();
    }

    if (this.level >= 3) {
      // 황금 장식
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // 스파이크 장식
      const spikes = 8;
      for (let i = 0; i < spikes; i++) {
        const angle = (i * Math.PI * 2) / spikes;
        const x1 = Math.cos(angle) * 16;
        const y1 = Math.sin(angle) * 16;
        const x2 = Math.cos(angle) * 20;
        const y2 = Math.sin(angle) * 20;

        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // 발사 이펙트
    if (this.target && Math.random() < 0.1) {
      ctx.save();
      ctx.rotate(this.barrelRotation);
      ctx.fillStyle = "#FF6B35";
      ctx.shadowColor = "#FF6B35";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(24, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 포탄을 발사합니다
   */
  attack() {
    if (!this.target) return;

    // 포물선 궤적을 그리는 포탄 생성
    const targetX = this.target.position.x;
    const targetY = this.target.position.y;

    const cannonball = new CannonballProjectile(
      this.position.x,
      this.position.y,
      targetX,
      targetY,
      250, // 적절한 속도로 조정
      this.stats.damage,
      this.stats.explosionRadius
    );

    // 기본 직선 투사체로 설정 (Projectile 생성자에서 자동으로 설정됨)

    if (this.projectiles.length >= this.maxProjectiles) {
      this.projectiles.shift();
    }
    this.projectiles.push(cannonball);

    // 발사 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createSmokeEffect(
        this.position.x,
        this.position.y,
        {
          count: 8,
          size: 4,
        }
      );
    }

    // 사운드 효과
    if (window.game && window.game.soundManager) {
      window.game.soundManager.playSound("shoot_cannon");
    }
  }

  /**
   * 업그레이드 시 호출되는 이벤트
   */
  onUpgrade() {
    this.stats.explosionRadius += 5;

    // 파티클 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createExplosion(
        this.position.x,
        this.position.y,
        {
          count: 15,
          colors: ["#ff4444", "#ff8844", "#ffaa44"],
          size: 3,
          speed: 60,
        }
      );
    }
  }
}

/**
 * 포탄 발사체
 */
class CannonballProjectile extends Projectile {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} targetX - 목표 x 좌표
   * @param {number} targetY - 목표 y 좌표
   * @param {number} speed - 이동 속도
   * @param {number} damage - 데미지
   * @param {number} explosionRadius - 폭발 반지름
   */
  constructor(x, y, targetX, targetY, speed, damage, explosionRadius) {
    super(x, y, targetX, targetY, speed, damage);
    this.explosionRadius = explosionRadius;
    // 포탄 트레일을 더 굵고 밝게 (연기 + 불빛 느낌)
    this.trail = new Trail(10, "#FF6B3566", 2.5);
  }

  /**
   * 포탄을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    // 기본 Projectile의 update 호출
    super.update(deltaTime);
  }

  /**
   * 포탄을 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    // 외곽 발광으로 포탄 가시성 강화
    ctx.save();
    ctx.shadowColor = "#FF8A50";
    ctx.shadowBlur = 14;

    // 포탄 본체 (더 큰 반지름)
    ctx.fillStyle = "#3E4A59";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(this.size.x / 2 + 2, 6), 0, Math.PI * 2);
    ctx.fill();

    // 측면 하이라이트
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#B0BEC5";
    ctx.beginPath();
    ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 포탄이 폭발했을 때
   */
  onHit() {
    // 범위 내 적들에게 데미지
    if (window.game && window.game.enemyManager) {
      for (const enemy of window.game.enemyManager.enemies) {
        if (
          enemy.isAlive &&
          this.position.distanceTo(enemy.position) <= this.explosionRadius
        ) {
          enemy.takeDamage(this.damage, "explosive");
        }
      }
    }

    // 폭발 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createExplosion(
        this.position.x,
        this.position.y,
        {
          count: 25,
          colors: ["#ff4444", "#ff8844", "#ffaa44", "#ffdd44"],
          size: 6,
          speed: 120,
          life: 1000,
        }
      );
    }

    super.onHit();
  }
}

/**
 * 마법 타워 - 적을 느리게 하는 특수 효과가 있는 타워
 */
class MagicTower extends Tower {
  constructor(x, y) {
    const stats = {
      damage: 2, // 체인라이트닝 기본 데미지 (낮은 공격력)
      range: 100, // 체인라이트닝 범위
      attackSpeed: 1.0, // 공격 속도 (1초마다)
      cost: 20, // 중간 가격
      upgradeCost: 30,
      sellValue: 15,
      chainCount: 3, // 연쇄 공격 횟수
      chainRange: 60, // 연쇄 공격 범위
      slowAmount: 0.36, // 36% 속도 감소 (둔화 효과)
    };

    super(x, y, stats);
    this.towerType = "magic";
    this.magicEnergy = 0;
    this.energyDirection = 1;

    // 업그레이드 능력
    this.chainCount = stats.chainCount;
    this.chainRange = stats.chainRange;
    this.chainLightning = true; // 연쇄 번개
    this.slowAmount = stats.slowAmount; // 둔화 효과

    // 공격 쿨다운
    this.attackCooldown = 0;

    // 둔화 적용 추적을 위한 Set
    this.slowedEnemies = new Set();
  }

  /**
   * 마법 타워 특수 능력 업그레이드
   */
  upgradeSpecialAbilities() {
    if (this.level === 2) {
      // 레벨 2: 강화된 체인라이트닝 + 둔화
      this.chainCount = 4; // 연쇄 공격 횟수 증가 (3 → 4)
      this.chainRange = 80; // 연쇄 범위 증가 (60 → 80)
      this.slowAmount = 0.48; // 48% 속도 감소 (36% → 48%)
      this.stats.range = Math.round(this.stats.range * 1.2); // 기본 범위 20% 증가
    } else if (this.level === 3) {
      // 레벨 3: 최강 체인라이트닝 + 둔화
      this.chainCount = 5; // 연쇄 공격 횟수 최대 (4 → 5)
      this.chainRange = 100; // 연쇄 범위 최대 (80 → 100)
      this.slowAmount = 0.54; // 54% 속도 감소 (48% → 54%)
      this.stats.range = Math.round(this.stats.range * 1.3); // 기본 범위 30% 추가 증가
      this.stats.attackSpeed = 1.5; // 공격 속도 증가 (1.0 → 1.5)
    }
  }

  /**
   * 마법 타워를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   * @param {Array} enemies - 적 배열
   */
  update(deltaTime, enemies) {
    if (!this.canAttack) return;

    // 마법 에너지 애니메이션
    this.magicEnergy += this.energyDirection * deltaTime * 0.002;
    if (this.magicEnergy >= 1) {
      this.magicEnergy = 1;
      this.energyDirection = -1;
    } else if (this.magicEnergy <= 0) {
      this.magicEnergy = 0;
      this.energyDirection = 1;
    }

    // 공격 쿨다운 업데이트
    this.attackCooldown -= deltaTime;

    // 둔화 효과 적용 (범위 내 모든 적에게)
    if (window.game && window.game.enemyManager) {
      let hasEnemiesInRange = false;
      const currentEnemiesInRange = new Set();

      for (const enemy of window.game.enemyManager.enemies) {
        if (!enemy.isAlive) continue;

        const distance = this.distanceTo(enemy);
        if (distance <= this.stats.range) {
          hasEnemiesInRange = true;
          currentEnemiesInRange.add(enemy);
          // 둔화 효과 상시 적용
          enemy.applyStatusEffect("slow", 10000, this.slowAmount);
        }
      }

      // 범위를 벗어난 적들의 둔화 효과 제거
      for (const enemy of this.slowedEnemies) {
        if (!currentEnemiesInRange.has(enemy)) {
          enemy.removeStatusEffect("slow");
          this.slowedEnemies.delete(enemy);
        }
      }

      // 현재 범위 내 적들을 추적
      this.slowedEnemies = currentEnemiesInRange;

      // 체인라이트닝 공격
      if (this.attackCooldown <= 0) {
        const target = this.findTarget(enemies);
        if (target) {
          this.performChainLightning(target);
          this.attackCooldown = 1000 / this.stats.attackSpeed;
        }
      }
    }
  }

  /**
   * 체인라이트닝 공격을 수행합니다
   * @param {Enemy} firstTarget - 첫 번째 타겟
   */
  performChainLightning(firstTarget) {
    if (!window.game || !window.game.enemyManager) return;

    const hitEnemies = new Set();
    const chainPath = []; // 연쇄 경로를 저장
    let currentTarget = firstTarget;
    let chainCount = 0;

    // 첫 번째 타겟 공격 (타워에서 첫 번째 적으로)
    this.attackEnemy(currentTarget);
    hitEnemies.add(currentTarget);
    chainPath.push({
      from: this.position,
      to: currentTarget.position,
    });
    chainCount++;

    // 연쇄 공격 수행
    while (chainCount < this.chainCount && currentTarget) {
      const nextTarget = this.findNextChainTarget(currentTarget, hitEnemies);
      if (nextTarget) {
        this.attackEnemy(nextTarget);
        hitEnemies.add(nextTarget);

        // 연쇄 경로 추가 (현재 적에서 다음 적으로)
        chainPath.push({
          from: currentTarget.position,
          to: nextTarget.position,
        });

        currentTarget = nextTarget;
        chainCount++;
      } else {
        break; // 더 이상 연쇄할 적이 없음
      }
    }

    // 체인라이트닝 시각적 효과 생성
    this.createChainLightningEffect(chainPath);

    // 시각적 효과 생성
    this.attack();
  }

  /**
   * 다음 연쇄 타겟을 찾습니다
   * @param {Enemy} currentTarget - 현재 타겟
   * @param {Set} hitEnemies - 이미 공격받은 적들
   * @returns {Enemy|null} 다음 타겟
   */
  findNextChainTarget(currentTarget, hitEnemies) {
    if (!window.game || !window.game.enemyManager) return null;

    let closestEnemy = null;
    let closestDistance = Infinity;

    for (const enemy of window.game.enemyManager.enemies) {
      if (!enemy.isAlive || hitEnemies.has(enemy)) continue;

      const distance = currentTarget.distanceTo(enemy);
      if (distance <= this.chainRange) {
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }
    }

    return closestEnemy;
  }

  /**
   * 적을 공격합니다
   * @param {Enemy} enemy - 공격할 적
   */
  attackEnemy(enemy) {
    if (!enemy || !enemy.isAlive) return;

    // 데미지 적용
    enemy.takeDamage(this.stats.damage);
  }

  /**
   * 체인라이트닝 시각적 효과를 생성합니다
   * @param {Array} chainPath - 연쇄 경로 배열
   */
  createChainLightningEffect(chainPath) {
    if (!window.game || !window.game.particleSystem) return;

    // 각 연쇄 구간에 대해 번개 효과 생성
    for (const segment of chainPath) {
      window.game.particleSystem.createLightningEffect(
        segment.from.x,
        segment.from.y,
        segment.to.x,
        segment.to.y
      );
    }

    // 마지막 적에게 충격 파티클 생성
    if (chainPath.length > 0) {
      const lastTarget = chainPath[chainPath.length - 1].to;
      window.game.particleSystem.createHitEffect(lastTarget.x, lastTarget.y, {
        count: 15,
        colors: ["#ffffff", "#ffff88", "#88ffff"],
        size: 3,
        life: 600,
      });
    }
  }

  /**
   * 마법 타워를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    // 사정거리 표시 (다른 타워와 동일한 방식)
    if (this.rangeAlpha > 0) {
      this.drawRange(ctx);
    }

    // 타워 본체 그리기
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    this.render(ctx);
    ctx.restore();

    // 선택 표시
    if (this.isSelected) {
      this.drawSelection(ctx);
    }

    // 레벨 표시
    this.drawLevel(ctx);

    // 둔화 범위 시각적 효과 (항상 표시)
    this.drawSlowField(ctx);
  }

  /**
   * 마법 타워를 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    const levelScale = 1 + (this.level - 1) * 0.1;
    const time = performance.now() * 0.001;

    ctx.save();
    ctx.scale(levelScale, levelScale);

    // 타워 그림자 - 중앙 기준
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 타워 베이스 (신비로운 돌)
    const mysticalGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12.5);
    mysticalGradient.addColorStop(0, "#9370DB");
    mysticalGradient.addColorStop(0.5, "#4B0082");
    mysticalGradient.addColorStop(1, "#2E0854");
    ctx.fillStyle = mysticalGradient;
    ctx.fillRect(-12.5, -12.5, 25, 25);

    // 룬 문자 각인 - 격자에 맞게 크기 조정
    ctx.strokeStyle = "#DDA0DD";
    ctx.lineWidth = 2;
    const runePositions = [
      { x: -16, y: -16 },
      { x: 16, y: -16 },
      { x: -16, y: 16 },
      { x: 16, y: 16 },
    ];
    runePositions.forEach((pos, i) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate((time + i) * 0.5);
      // 간단한 룬 심볼 - 격자에 맞게 크기 조정
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -5);
      ctx.lineTo(-5, 5);
      ctx.stroke();
      ctx.restore();
    });

    // 마법 원 (다층)
    const energyAlpha = 0.4 + this.magicEnergy * 0.6;
    ctx.save();
    ctx.globalAlpha = energyAlpha;

    // 외부 원 - 격자에 맞게 크기 조정
    ctx.strokeStyle = "#8A2BE2";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();

    // 중간 원
    ctx.strokeStyle = "#9370DB";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // 내부 원
    ctx.strokeStyle = "#DDA0DD";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 중앙 크리스탈 (더 정교하게)
    const crystalBrightness = 60 + this.magicEnergy * 40;
    const crystalColor = hslToRgb(280, 80, crystalBrightness);

    // 크리스탈 그림자 - 격자에 맞게 크기 조정
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-8, 12);
    ctx.lineTo(2, 18);
    ctx.lineTo(12, 12);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();

    // 크리스탈 메인 - 격자에 맞게 크기 조정
    ctx.fillStyle = crystalColor;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-9, -3);
    ctx.lineTo(-9, 9);
    ctx.lineTo(0, 15);
    ctx.lineTo(9, 9);
    ctx.lineTo(9, -3);
    ctx.closePath();
    ctx.fill();

    // 크리스탈 하이라이트 - 격자에 맞게 크기 조정
    ctx.fillStyle = hslToRgb(280, 60, 90);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-4, -9);
    ctx.lineTo(-4, -3);
    ctx.lineTo(0, -9);
    ctx.closePath();
    ctx.fill();

    // 크리스탈 발광 효과
    if (this.magicEnergy > 0.3) {
      ctx.shadowColor = crystalColor;
      ctx.shadowBlur = 15 * this.magicEnergy;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 마법 파티클 (더 많고 화려하게)
    if (this.magicEnergy > 0.2) {
      const particleCount = Math.floor(5 + this.magicEnergy * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle =
          (time * 2 + (i * Math.PI * 2) / particleCount) % (Math.PI * 2);
        const radius = 18 + Math.sin(time * 3 + i) * 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = 1 + Math.sin(time * 4 + i) * 1;

        ctx.fillStyle = hslToRgb(280 + i * 15, 100, 70, this.magicEnergy * 0.8);
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 레벨에 따른 장식
    if (this.level >= 2) {
      // 마법 깃발
      ctx.fillStyle = "#8A2BE2";
      ctx.fillRect(-2, -25, 6, 8);
      ctx.strokeStyle = "#4B0082";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, -25);
      ctx.lineTo(-2, -8);
      ctx.stroke();

      // 깃발에 별 장식
      ctx.fillStyle = "#FFD700";
      this.drawStar(ctx, 1, -21, 2, "#FFD700");
    }

    if (this.level >= 3) {
      // 황금 마법진
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();

      // 회전하는 룬들
      const runeCount = 6;
      for (let i = 0; i < runeCount; i++) {
        const angle =
          (time * 0.5 + (i * Math.PI * 2) / runeCount) % (Math.PI * 2);
        const x = Math.cos(angle) * 25;
        const y = Math.sin(angle) * 25;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + time);
        ctx.fillStyle = "#FFD700";
        this.drawStar(ctx, 0, 0, 3, "#FFD700");
        ctx.restore();
      }
    }

    // 마법 에너지 오라
    if (this.magicEnergy > 0.7) {
      ctx.save();
      ctx.globalAlpha = (this.magicEnergy - 0.7) * 0.5;
      const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      auraGradient.addColorStop(0, "transparent");
      auraGradient.addColorStop(0.8, "transparent");
      auraGradient.addColorStop(1, "#8A2BE2");
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 별을 그립니다
   */
  drawStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const radius = i % 2 === 0 ? size : size / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * 둔화 효과 시각적 효과를 생성합니다
   */
  attack() {
    if (!window.game || !window.game.enemyManager) return;

    let affectedEnemies = 0;

    // 범위 내 적 수 계산
    for (const enemy of window.game.enemyManager.enemies) {
      if (!enemy.isAlive) continue;

      const distance = this.distanceTo(enemy);
      if (distance <= this.stats.range) {
        affectedEnemies++;
      }
    }

    // 둔화 효과가 적용된 적이 있으면 시각적 효과 생성
    if (affectedEnemies > 0) {
      if (window.game && window.game.particleSystem) {
        window.game.particleSystem.createMagicEffect(
          this.position.x,
          this.position.y,
          {
            count: Math.min(affectedEnemies * 2, 10),
            colors: ["#8A2BE2", "#9370DB", "#BA55D3", "#DDA0DD"],
            size: 3,
            speed: 20,
          }
        );
      }

      // 사운드 효과 (가끔만 재생)
      if (window.game && window.game.soundManager && Math.random() < 0.1) {
        window.game.soundManager.playSound("shoot_magic");
      }
    }
  }

  /**
   * 업그레이드 시 호출되는 이벤트
   */
  onUpgrade() {
    this.stats.slowDuration += 500; // 0.5초 추가
    this.stats.slowAmount = Math.min(0.8, this.stats.slowAmount + 0.1); // 최대 80%까지

    // 파티클 효과
    if (window.game && window.game.particleSystem) {
      window.game.particleSystem.createMagicEffect(
        this.position.x,
        this.position.y,
        {
          count: 20,
          colors: ["#8A2BE2", "#9370DB", "#BA55D3", "#DDA0DD"],
          size: 5,
          life: 1500,
        }
      );
    }
  }

  /**
   * 사정거리를 그립니다 (마법 타워 전용 - 둔화 범위)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawRange(ctx) {
    ctx.save();

    // 마법 타워 전용 색상 (보라색 계열)
    const rangeColor = "#8844ff";

    // 외곽 링 (둔화 범위 표시)
    ctx.globalAlpha = this.rangeAlpha * 0.7;
    ctx.strokeStyle = rangeColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.stats.range, 0, Math.PI * 2);
    ctx.stroke();

    // 내부 채우기 (둔화 영역 표시)
    ctx.globalAlpha = this.rangeAlpha * 0.2;
    ctx.fillStyle = rangeColor;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.stats.range, 0, Math.PI * 2);
    ctx.fill();

    // 둔화 효과 시각화 (파동 효과)
    const time = performance.now() * 0.001;
    const waveAlpha = this.rangeAlpha * (0.3 + Math.sin(time * 4) * 0.2);
    ctx.globalAlpha = waveAlpha;
    ctx.strokeStyle = "#DDA0DD";
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.arc(
      this.position.x,
      this.position.y,
      this.stats.range * 0.8,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // 범위 값 표시
    ctx.globalAlpha = this.rangeAlpha;
    ctx.fillStyle = rangeColor;
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `둔화 범위: ${this.stats.range}px`,
      this.position.x,
      this.position.y + this.stats.range + 20
    );

    ctx.restore();
  }

  /**
   * 둔화 범위 시각적 효과를 그립니다 (항상 표시)
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  drawSlowField(ctx) {
    const time = performance.now() * 0.001;
    const pulseAlpha = 0.2 + Math.sin(time * 2) * 0.15;

    ctx.save();
    ctx.globalAlpha = pulseAlpha;

    // 둔화 범위 원 (외곽) - 더 명확하게
    const gradient = ctx.createRadialGradient(
      this.position.x,
      this.position.y,
      0,
      this.position.x,
      this.position.y,
      this.stats.range
    );
    gradient.addColorStop(0, "rgba(138, 43, 226, 0.5)");
    gradient.addColorStop(0.3, "rgba(147, 112, 219, 0.3)");
    gradient.addColorStop(0.7, "rgba(221, 160, 221, 0.15)");
    gradient.addColorStop(1, "rgba(221, 160, 221, 0.05)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.stats.range, 0, Math.PI * 2);
    ctx.fill();

    // 둔화 범위 경계선 - 더 명확하게
    ctx.strokeStyle = `rgba(138, 43, 226, ${0.5 + Math.sin(time * 3) * 0.3})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 둔화 효과 파동 (내부) - 더 명확하게
    ctx.globalAlpha = pulseAlpha * 0.8;
    ctx.strokeStyle = "#DDA0DD";
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.arc(
      this.position.x,
      this.position.y,
      this.stats.range * 0.7,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // 둔화 효과 파동 (중앙) - 더 명확하게
    ctx.globalAlpha = pulseAlpha * 0.6;
    ctx.strokeStyle = "#FF69B4";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.arc(
      this.position.x,
      this.position.y,
      this.stats.range * 0.4,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}

/**
 * 마법 미사일 발사체
 */
class MagicMissileProjectile extends Projectile {
  /**
   * @param {number} x - 시작 x 좌표
   * @param {number} y - 시작 y 좌표
   * @param {number} targetX - 목표 x 좌표
   * @param {number} targetY - 목표 y 좌표
   * @param {number} speed - 이동 속도
   * @param {number} damage - 데미지
   * @param {Entity} targetEntity - 타겟 엔티티
   * @param {number} slowDuration - 둔화 지속 시간
   * @param {number} slowAmount - 둔화 정도
   */
  constructor(
    x,
    y,
    targetX,
    targetY,
    speed,
    damage,
    targetEntity,
    slowDuration,
    slowAmount
  ) {
    super(x, y, targetX, targetY, speed, damage);
    this.targetEntity = targetEntity;
    this.slowDuration = slowDuration;
    this.slowAmount = slowAmount;
    // 마법 미사일 트레일을 더욱 선명하고 길게
    this.trail = new Trail(14, "#A066FF66", 2.2);
    this.sparkles = [];
    this.sparkleTimer = 0;
  }

  /**
   * 마법 미사일을 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   */
  update(deltaTime) {
    // 궁수 화살과 같은 직선 비행 (유도 제거)
    super.update(deltaTime);

    // 반짝임 효과
    this.sparkleTimer += deltaTime;
    if (this.sparkleTimer > 50) {
      // 50ms마다
      this.sparkleTimer = 0;
      this.sparkles.push({
        x: this.position.x + randomFloat(-5, 5),
        y: this.position.y + randomFloat(-5, 5),
        life: 300,
        maxLife: 300,
      });
    }

    // 반짝임 업데이트
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= deltaTime;
      if (this.sparkles[i].life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }

    // 목표 지점에 도달했는지 확인
    if (this.position.distanceTo(this.target) < 15) {
      this.onHit();
      return;
    }

    // 타겟과의 충돌 검사 (직선 비행 중에도 타겟이 근처에 있으면 히트)
    if (this.targetEntity && this.targetEntity.isAlive) {
      if (this.distanceTo(this.targetEntity) < 15) {
        this.onHit();
      }
    }
  }

  /**
   * 마법 미사일을 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    super.draw(ctx);

    // 반짝임 효과 그리기
    for (const sparkle of this.sparkles) {
      const alpha = sparkle.life / sparkle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = hslToRgb(280, 100, 80);
      ctx.beginPath();
      ctx.arc(sparkle.x, sparkle.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 마법 미사일을 렌더링합니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  render(ctx) {
    // 더 강한 발광 코어 + 외곽 링
    ctx.save();
    ctx.shadowColor = "#C09BFF";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#8E5BFF";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(this.size.x / 2 + 4, 7), 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.fillStyle = "#F2E9FF";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(this.size.x / 2, 5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 마법 미사일이 적중했을 때
   */
  onHit() {
    if (this.targetEntity && this.targetEntity.isAlive) {
      this.targetEntity.takeDamage(this.damage, "magic");

      // 둔화 효과 적용
      this.targetEntity.applyStatusEffect(
        "slow",
        this.slowDuration,
        this.slowAmount
      );

      // 마법 타격 효과
      if (window.game && window.game.particleSystem) {
        window.game.particleSystem.createMagicEffect(
          this.position.x,
          this.position.y,
          {
            count: 12,
            colors: ["#8A2BE2", "#9370DB", "#BA55D3", "#DDA0DD"],
            size: 4,
            life: 800,
          }
        );
      }
    }

    super.onHit();
  }
}

/**
 * 타워 관리자 클래스
 */
class TowerManager {
  constructor() {
    this.towers = [];
    this.selectedTower = null;
    this.placementMode = false;
    this.placementTowerType = null;
    this.gridSize = 40;
  }

  /**
   * 타워를 추가합니다
   * @param {Tower} tower - 추가할 타워
   */
  addTower(tower) {
    this.towers.push(tower);
  }

  /**
   * 타워를 제거합니다
   * @param {Tower} tower - 제거할 타워
   */
  removeTower(tower) {
    const index = this.towers.indexOf(tower);
    if (index !== -1) {
      this.towers.splice(index, 1);
    }

    if (this.selectedTower === tower) {
      this.selectedTower = null;
    }
  }

  /**
   * 모든 타워를 업데이트합니다
   * @param {number} deltaTime - 프레임 간 시간차
   * @param {Array} enemies - 적 배열
   */
  update(deltaTime, enemies) {
    for (const tower of this.towers) {
      tower.update(deltaTime, enemies);
    }
  }

  /**
   * 모든 타워를 그립니다
   * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
   */
  draw(ctx) {
    for (const tower of this.towers) {
      tower.draw(ctx);
    }
  }

  /**
   * 타워를 선택합니다
   * @param {number} x - 클릭 x 좌표
   * @param {number} y - 클릭 y 좌표
   * @returns {Tower|null} 선택된 타워
   */
  selectTower(x, y) {
    // 이전 선택 해제
    if (this.selectedTower) {
      this.selectedTower.isSelected = false;
      this.selectedTower.showRange = false;
    }

    // 새로운 타워 선택
    for (const tower of this.towers) {
      if (tower.containsPoint(x, y)) {
        this.selectedTower = tower;
        tower.isSelected = true;
        tower.showRange = true;
        return tower;
      }
    }

    this.selectedTower = null;
    return null;
  }

  /**
   * 타워 배치 가능 여부를 확인합니다
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   * @returns {boolean} 배치 가능 여부
   */
  canPlaceTower(x, y) {
    // 이미 격자 중앙 좌표로 변환된 좌표를 사용
    const gridX = x;
    const gridY = y;

    // 맵 경계 확인 (동적으로 계산)
    const mapWidth = window.game ? window.game.mapWidth * this.gridSize : 900;
    const mapHeight = window.game ? window.game.mapHeight * this.gridSize : 600;

    if (gridX < 0 || gridX >= mapWidth || gridY < 0 || gridY >= mapHeight) {
      return false;
    }

    // 격자 좌표 계산
    const mapX = Math.floor(gridX / this.gridSize);
    const mapY = Math.floor(gridY / this.gridSize);

    // 맵 데이터 확인 (장식 요소나 경로 체크)
    if (
      window.game &&
      window.game.map &&
      mapY < window.game.map.length &&
      mapX < window.game.map[mapY].length
    ) {
      const cell = window.game.map[mapY][mapX];
      if (!cell.canBuildTower) {
        return false; // 나무나 바위 등 장식 요소가 있는 곳
      }
    }

    // 다른 타워와 겹치는지 확인
    for (const tower of this.towers) {
      if (
        distance(tower.position.x, tower.position.y, gridX, gridY) <
        this.gridSize
      ) {
        return false;
      }
    }

    // 경로와 겹치는지 확인
    if (window.game && window.game.path) {
      for (const pathPoint of window.game.path) {
        if (distance(pathPoint.x, pathPoint.y, gridX, gridY) < 35) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 타워를 배치합니다
   * @param {string} towerType - 타워 타입
   * @param {number} x - x 좌표
   * @param {number} y - y 좌표
   * @returns {Tower|null} 배치된 타워
   */
  placeTower(towerType, x, y) {
    // 이미 격자 중앙 좌표로 변환된 좌표를 사용
    const gridX = x;
    const gridY = y;

    let tower = null;

    switch (towerType) {
      case "archer":
        tower = new ArcherTower(gridX, gridY);
        break;
      case "cannon":
        tower = new CannonTower(gridX, gridY);
        break;
      case "magic":
        tower = new MagicTower(gridX, gridY);
        break;
    }

    if (tower) {
      this.addTower(tower);
    }

    return tower;
  }

  /**
   * 선택된 타워를 업그레이드합니다
   * @returns {boolean} 업그레이드 성공 여부
   */
  upgradeSelectedTower() {
    if (this.selectedTower) {
      return this.selectedTower.upgrade();
    }
    return false;
  }

  /**
   * 선택된 타워를 판매합니다
   * @returns {number} 판매 가격
   */
  sellSelectedTower() {
    if (this.selectedTower) {
      const sellValue = this.selectedTower.getSellValue();
      this.removeTower(this.selectedTower);
      return sellValue;
    }
    return 0;
  }

  /**
   * 모든 타워를 제거합니다
   */
  clear() {
    this.towers = [];
    this.selectedTower = null;
  }
}
