import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;

const ABILITY_COOLDOWN_CONFIG = new Map([
  // Knarfy 粉碎（Knarfy Shatter） - 设置时间减少至 2 秒
  // ["crack", [8000, 1.0, 0.0]],
  ["crack", [2000, 1.0, 0.0]],
  ["charge", [10000, 1.0, 0.5]],
  ["breath", [12000, 0.5, 0.0]],
  ["charge_crack", [12000, 0.5, 0.0]],
  ["snowstorm", [20000, 0.2, 0.0]],
  ["breath_snowstorm", [20000, 0.2, 0.0]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:knarfy_boss") {
      entity.onTriggerEvent(args.eventId);
    }
  });

  mc.world.afterEvents.entityHealthChanged.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:knarfy_boss") {
      entity.onHealthChanged(args.newValue);
    }
  });
}

export class KnarfyBossEntity extends BossEntityBase {
  constructor(entityId) {
    super(entityId);
    this.usedRoar = false;
    if (!IS_ACTIVE) startListenEvent();
  }

  onHealthChanged(newValue) {
    // mc.world.sendMessage(`health -> ${newValue}`);
  }

  onTriggerEvent(eventId) {
    // mc.world.sendMessage(`trigger -> ${eventId}`);
    if (eventId === "event:try_active_ability") this.tryActiveAbility();
  }

  tryActiveAbility() {
    let preTime = Date.now();
    let availableAbility = ["punch", "slam"];
    let healthRate = this.getHealthRate();

    ABILITY_COOLDOWN_CONFIG.forEach((config, abilityId) => {
      let [cooldownTime, belowRate, leastRate] = config;
      if (
        leastRate < healthRate &&
        healthRate <= belowRate &&
        (!this.abilityCd.get(abilityId) ||
          preTime - this.abilityCd.get(abilityId) >= cooldownTime)
      )
        availableAbility.push(abilityId);
    });

    if (!this.usedRoar && healthRate <= 0.5) {
      this.usedRoar = true;
      this.setRoar();
      return;
    }

    let abilityId = zdk.randomChoice(availableAbility);
    if (abilityId === "punch") this.setPunch(abilityId);
    if (abilityId === "slam") this.setSlam(abilityId);
    if (abilityId === "crack") this.setCrack(abilityId);
    if (abilityId === "charge") this.setCharge(abilityId);
    if (abilityId === "breath") this.setBreath(abilityId);
    if (abilityId === "charge_crack") this.setChargeCrack(abilityId);
    if (abilityId === "snowstorm") this.setSnowstorm(abilityId);
    if (abilityId === "breath_snowstorm") this.setBreathSnowstorm(abilityId);
  }

  ROAR_DURATION = parseInt(2.25 * 20);
  setRoar() {
    this.triggerEvent("event:set_use_roar");
    this.delayResetAbility(this.ROAR_DURATION);
  }

  /**
   * Knarfy Claw / Basic Attack
   * Knarfy will swing one of its huge claw to attack,
   * its massive claw will inflict deep wounds deal 6 damage to the player
   * and also knock the player back up to 4 blocks.
   */

  /**
   * Knarfy Slam / Basic Attack 2
   * Knarfy will slam both of its claws to the enemy,
   * deal 8 damage and knock the enemy 5 blocks away.
   */
  // CHANGE: Knarfy 利爪（Knarfy Claw） - 伤害提升至 8 点
  // PUNCH_DAMAGE = 6;
  PUNCH_DAMAGE = 8;
  PUNCH_DURATION = parseInt(1.0 * 20);
  PUNCH_ATTACK_TIME = parseInt(0.4 * 20);
  PUNCH_KNOCK_POWER = [2.5, 0.15];
  setPunch(abilityId) {
    this.triggerEvent("event:set_use_punch");
    this.delayResetAbility(this.PUNCH_DURATION, 5);

    let active = function* () {
      yield this.PUNCH_ATTACK_TIME - 5;
      this.impuseForward(this.entity, 0.5);
      yield 5;
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 1);
      for (let victim of this.getRadiusEntity(spawnPos, 3)) {
        zdk.setPosKockback(victim, spawnPos, this.PUNCH_KNOCK_POWER);
        victim.applyDamage(this.PUNCH_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // CHANGE: Knarfy 猛击（Knarfy Slam） - 伤害提升至 10 点
  // SLAM_DAMAGE = 8;
  SLAM_DAMAGE = 10;
  SLAM_DURATION = parseInt(1.25 * 20);
  SLAM_ATTACK_TIME = parseInt(0.5 * 20);
  SLAM_KNOCK_POWER = [3.5, 0.15];
  setSlam(abilityId) {
    this.triggerEvent("event:set_use_slam");
    this.delayResetAbility(this.SLAM_DURATION, 15);

    let active = function* () {
      yield this.SLAM_ATTACK_TIME - 5;
      this.impuseForward(this.entity, 0.5);
      yield 5;
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 1);
      for (let victim of this.getRadiusEntity(spawnPos, 4)) {
        zdk.setPosKockback(victim, spawnPos, this.SLAM_KNOCK_POWER);
        victim.applyDamage(this.SLAM_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  /**
   * Knarfy will raise both of its front claws and after 3 seconds knarfy will slam both of its claw to the ground,
   * shatter up to 7-blocks ahead of the knarfy with 4 blocks wide area.
   * Its like a wall breaker that will break all the blocks above the ground within the attack area.
   * All entities within the attack range will get 7 damage and knocked back by 3 blocks away
   * and stunned by receiving Nausea I effect for 5 seconds.
   *
   * This skill will have a cooldown time of 8 seconds.
   * This skill will have an area attack up to 7 blocks long and 4 blocks wide in front of Knarfy.
   * When Knarfy release the skill, execute action bar that says: “Dodge to the side!”
   */
  CRACK_RAIUDS = 7;
  CRACK_ATTACK_TIME = parseInt(3.13 * 20);
  // CHANGE: 伤害提升至 8 点
  // CRACK_DAMAGE = 7;
  CRACK_DAMAGE = 8;
  // CHANGE: 并增加 5 格的击退范围
  // CRACK_KNOCK_POWER = [2.5, 0.15];
  CRACK_KNOCK_POWER = [3.5, 0.3];
  CRACK_DURATION = parseInt(4.2 * 20);
  setCrack(abilityId) {
    this.triggerEvent("event:set_use_crack");
    this.setPlayerTip(20, "Dodge to the side!");
    this.delayResetAbility(this.CRACK_DURATION);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.CRACK_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    this.delayExecute(this.CRACK_ATTACK_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = this.entity.location;
      for (let victim of this.getRadiusEntity(spawnPos, this.CRACK_RAIUDS)) {
        zdk.setPosKockback(victim, spawnPos, this.CRACK_KNOCK_POWER);
        victim.addEffect("nausea", 5 * 20, { amplifier: 1 });
        victim.applyDamage(this.CRACK_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    });
  }

  setChargeHit() {
    this.triggerEvent("event:set_charge_hit");
    this.delayExecute(10, () => {
      if (!this.entity || !this.entity.isValid()) return;
      this.triggerEvent("event:reset_charge_hit");
    });
  }

  /**
   * Knarfy will square off by backing off by 4 blocks before the Knarfy run and charge its body to straight to the front for 6 seconds will stop running
   * when Knarfy either hit player or hit a wall.
   * If player is in the way and get hit by the charge player will receive 12 damage
   * and if player using shield the attack will break the shield that player use to block the attack.
   * After receiving damage player will also knocked back by 4 blocks away.
   *
   * This skill will have a cooldown time of 10 seconds.
   * When Knarfy release the skill, execute action bar that says: “Knarfy will ram towards you, avoid him!”
   */
  CHARGE_BACKWARD_TIME = parseInt(2.75 * 20);
  CHARGE_BACKWARD_POWER = 0.05;
  CHARGE_FORWARD_POWER = 0.15;
  CHARGE_HIT_TIME = parseInt(0.5 * 20);
  CHARGE_END_TIME = parseInt(1.25 * 20);
  CHANGE_DAMAGE = 12;
  CHANGE_KNOCK_POWER = [5.0, 0.2];
  setCharge(abilityId) {
    this.triggerEvent("event:set_use_charge");
    this.setPlayerTip(20, "Knarfy will ram towards you, avoid him!");

    let ticks = 0;
    let isHit = false;
    let runId = mc.system.runInterval(() => {
      if (!this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }

      if (ticks % 10 == 0) {
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
      }

      if (ticks <= this.CHARGE_BACKWARD_TIME) {
        try {
          this.impuseBackward(this.entity, this.CHARGE_BACKWARD_POWER);
        } catch (e) {
          this.clearRun(runId);
          return;
        }
      } else {
        let cal = 0.03 * (ticks - this.CHARGE_BACKWARD_TIME);
        let power = 0.05 + Math.min(cal, this.CHARGE_FORWARD_POWER);
        try {
          this.impuseForward(this.entity, power);
        } catch (e) {
          this.clearRun(runId);
          return;
        }

        let spawnPos = zdk.getPosForward(this.entity, 1);
        let victims = this.getRadiusEntity(spawnPos, 3);
        if (victims.length > 0) {
          isHit = true;
        } else {
          let dimension = this.entity.dimension;
          let blcokPos = zdk.getPosForward(this.entity, 1);
          blcokPos.y = this.entity.location.y;
          let block = dimension.getBlock(blcokPos);
          if (block && !block.isAir) {
            isHit = true;
          }
        }
      }

      if (isHit || ticks >= this.CHARGE_BACKWARD_TIME + 20 * 3) {
        this.setOnChargeHit();
        this.abilityCd.set(
          abilityId,
          Date.now() + ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
        );
        this.clearRun(runId);
      }
      ticks++;
    }, 1);
    this.addRun(runId);
  }

  setOnChargeHit() {
    let victims = this.getRadiusEntity(zdk.getPosForward(this.entity, 1), 3);
    this.setChargeHit();
    this.delayExecute(this.CHARGE_HIT_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = this.entity.location;
      for (let victim of victims) {
        zdk.setPosKockback(victim, spawnPos, this.CHANGE_KNOCK_POWER);
        victim.applyDamage(this.CHANGE_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    });
    this.delayResetAbility(this.CHARGE_END_TIME);
  }

  setDurationFacingPlayer(duration) {
    let ticks = 0;
    let runId = mc.system.runInterval(() => {
      if (ticks >= duration || !this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }
      this.entity.runCommand(
        "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
      );
      ticks += 5;
    }, 5);
    this.addRun(runId);
  }

  /**
   * Knarfy will inhale for 4 seconds before knarfy start to shooting Frozen Ice Breath Particles from its mouth for 8 seconds.
   * The attack will aimed at the player an have an area of a triangle area from 1 blocks and up to 8 blocks wide in front of the Knarfy.
   * All the entities get hit by the breath will receive 5 damage per seconds for as long as the entity is in the attack area.
   * While receiving damage the victim will also get Slow II effect for 5 seconds.
   *
   * This skill will have a cooldown time of 12 seconds.
   * When Knarfy release the skill, execute action bar that says: “Avoid the freezing Knarfy Breath!”
   */
  BREATH_RADIUS = 5;
  // CHANGE: Knarfy 吐息（Knarfy Breath） - 伤害提升至 每秒 6 点
  // BREATH_DAMAGE = 5;
  BREATH_DAMAGE = 6;
  BREATH_ATTACK_TIME = parseInt(4.5 * 20);
  BREATH_DURATION = parseInt(6.5 * 20);
  setBreath(abilityId) {
    this.triggerEvent("event:set_use_breath");
    this.setPlayerTip(20, "Avoid the freezing Knarfy Breath!");
    this.delayResetAbility(this.BREATH_DURATION);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.BREATH_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );
    this.setDurationFacingPlayer(this.BREATH_ATTACK_TIME);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let endTime = parseInt(1.5 * 20);
      let ticks = 0;
      let runId = mc.system.runInterval(() => {
        if (ticks >= endTime || !this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
        let spawnPos = zdk.getPosForward(this.entity, 3);
        for (let victim of this.getRadiusEntity(spawnPos, 10)) {
          victim.addEffect("slowness", 5 * 20, { amplifier: 1 });
          victim.applyDamage(this.BREATH_DAMAGE);
        }
        ticks++;
      }, 1);
      this.addRun(runId);
    }, this.BREATH_ATTACK_TIME);
  }

  /**
   * A combination of the Knarfy Shatter and Charges, Knarfy will first do the Charges skill
   * and after the charges it will immediately do the Shatter skill.
   * The attack will do the same effect and damage to the player.
   *
   * This skill will have a cooldown time of 12 seconds.
   * When Knarfy release the skill, execute action bar that says: “Dodge to the side and avoid Knarfy!”
   */
  CHARGE_CRACK_ATTACK_TIME = parseInt(1.46 * 20);
  CHARGE_CRACK_START_TIME = parseInt(0.58 * 20);
  CHARGE_CRACK_END_TIME = parseInt(3.0 * 20);
  setChargeCrack(abilityId) {
    this.triggerEvent("event:set_use_charge_crack");
    this.setPlayerTip(20, "Dodge to the side and avoid Knarfy!");

    let isHit = false;
    let ticks = 0;
    let runId = mc.system.runInterval(() => {
      if (!this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }

      if (ticks % 10 == 0) {
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
      }

      if (ticks <= this.CHARGE_BACKWARD_TIME) {
        try {
          this.impuseBackward(this.entity, this.CHARGE_BACKWARD_POWER);
        } catch (e) {
          this.clearRun(runId);
          return;
        }
      } else {
        let cal = 0.03 * (ticks - this.CHARGE_BACKWARD_TIME);
        let power = 0.05 + Math.min(cal, this.CHARGE_FORWARD_POWER);
        try {
          this.impuseForward(this.entity, power);
        } catch (e) {
          this.clearRun(runId);
          return;
        }

        if (!this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        let spawnPos = zdk.getPosForward(this.entity, 1);
        let victims = this.getRadiusEntity(spawnPos, 3);

        if (victims.length > 0) {
          isHit = true;
        } else {
          let dimension = this.entity.dimension;
          let blcokPos = zdk.getPosForward(this.entity, 1);
          blcokPos.y = this.entity.location.y;
          let block = dimension.getBlock(blcokPos);
          if (block && !block.isAir) {
            isHit = true;
          }
        }
      }

      if (isHit || ticks >= this.CHARGE_BACKWARD_TIME + 20 * 3) {
        this.setOnChargeCrackHit();
        this.delayResetAbility(this.CHARGE_CRACK_END_TIME);
        this.abilityCd.set(
          abilityId,
          Date.now() + ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
        );
        this.clearRun(runId);
      }
      ticks++;
    }, 1);
    this.addRun(runId);
  }

  setOnChargeCrackHit() {
    this.setChargeHit();
    this.delayExecute(this.CHARGE_CRACK_START_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = this.entity.location;
      let victims = this.getRadiusEntity(zdk.getPosForward(this.entity, 1), 3);
      for (let victim of victims) {
        zdk.setPosKockback(victim, spawnPos, this.CRACK_KNOCK_POWER);
        victim.applyDamage(this.CHANGE_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    });
    this.delayExecute(this.CHARGE_CRACK_ATTACK_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = this.entity.location;
      let victims = this.getRadiusEntity(zdk.getPosForward(this.entity, 1), 5);
      for (let victim of victims) {
        zdk.setPosKockback(victim, spawnPos, this.CRACK_KNOCK_POWER);
        // CHANGE: Knarfy 粉碎冲击（Knarfy Shattering Charge） - 该技能的粉碎攻击伤害提升至 12 点
        victim.applyDamage(this.CRACK_DAMAGE + 4, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    });
  }

  /**
   * Knarfy will charging up for 5 seconds before unleashing a wide area of attack like instant frozen blizzard.
   * The attack will affect and freeze 10-blocks radius.
   * All entities within the attack area will be frozen immobilized for 6 seconds and get hit by 12 damage.
   *
   * This skill will have a cooldown time of 20 seconds.
   * When Knarfy release the skill, execute action bar that says: “Knarfy is doing something, run!”
   */
  SNOWSTORM_DAMAGE = 12;
  // CHANGE: Knarfy 暴风雪（Knarfy Blizzard） - 远程攻击范围增加至 15 格半径
  // SNOWSTORM_RADIUS = 20;
  SNOWSTORM_RADIUS = 30;
  SNOWSTORM_DURATION = parseInt(6.0 * 20);
  SNOWSTORM_ATTACK_TIME = parseInt(5.0 * 20);
  setSnowstorm(abilityId) {
    this.triggerEvent("event:set_use_snowstorm");
    this.setPlayerTip(20, "Knarfy is doing something, run!");
    this.delayResetAbility(this.SNOWSTORM_DURATION);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SNOWSTORM_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    this.delayExecute(this.SNOWSTORM_ATTACK_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let pos = this.entity.location;
      for (let victim of this.getRadiusEntity(pos, this.SNOWSTORM_RADIUS)) {
        victim.applyDamage(this.SNOWSTORM_DAMAGE);
        this.setTargetFreeze(victim, this.SNOWSTORM_DURATION);
      }
    });
  }

  /**
   * @param {mc.Entity} entity
   */
  setTargetFreeze(entity, duration) {
    let ticks = 0;
    let prePos = entity.location;
    let runId = mc.system.runInterval(() => {
      if (ticks >= duration || !this.entity || !this.entity.isValid()) {
        mc.system.clearRun(runId);
        return;
      }
      entity.teleport(prePos);
      ticks++;
    }, 1);
  }

  /**
   * A combination of Knarfy Breath and Knarfy Blizzard.
   * Knarfy will release the skill at the same time and will do and deal the same effect and damage to the enemy.
   * This skill will only released once by the Knarfy.
   *
   * When Knarfy release the skill, execute action bar that says: “Knarfy is releasing all its energy, run away!”
   */
  BREATH_SNOWSTORM_DURATION = parseInt(12.25 * 20);
  BREATH_SNOWSTORM_ATTACK_TIME = parseInt(10.0 * 20);
  BREATH_SNOWSTORM_BREATH_TIME = parseInt(11.5 * 20);
  setBreathSnowstorm(abilityId) {
    this.triggerEvent("event:set_use_breath_snowstorm");
    this.setPlayerTip(20, "Knarfy is releasing all its energy, run away!");
    this.delayResetAbility(this.BREATH_SNOWSTORM_DURATION);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.BREATH_SNOWSTORM_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    this.delayExecute(this.BREATH_SNOWSTORM_ATTACK_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let pos = zdk.getPosForward(this.entity, 2);
      for (let victim of this.getRadiusEntity(pos, this.BREATH_RADIUS)) {
        victim.applyDamage(this.SNOWSTORM_DAMAGE);
        this.setTargetFreeze(victim, this.SNOWSTORM_DURATION);
      }
    });

    this.delayExecute(this.BREATH_SNOWSTORM_BREATH_TIME, () => {
      if (!this.entity || !this.entity.isValid()) return;
      let pos = zdk.getPosForward(this.entity, 2);
      for (let victim of this.getRadiusEntity(pos, this.SNOWSTORM_RADIUS)) {
        victim.addEffect("slowness", 5 * 20, { amplifier: 1 });
        victim.applyDamage(this.BREATH_DAMAGE);
      }
    });
  }
}
