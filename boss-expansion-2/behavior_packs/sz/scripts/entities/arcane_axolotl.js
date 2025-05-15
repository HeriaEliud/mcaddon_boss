import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;
const PJD_ATTACK1_ID = "sz_workshop:pjd_arcane_axolotl_atk1";
const PJD_ATTACK2_ID = "sz_workshop:pjd_arcane_axolotl_atk2";
const PJD_SKILL1_ID = "sz_workshop:pjd_arcane_axolotl_sk1";
const DET_SKILL5_ID = "sz_workshop:det_arcane_axolotl_sk5";

const ABILITY_COOLDOWN_CONFIG = new Map([
  // CHANGE: 水弹 - 设置时间减少至 3 秒
  // ["skill1", [8000, 1.0]],
  ["skill1", [3000, 1.0]],
  ["skill2", [30000, 1.0]],
  // CHANGE: 水喷射 - 设置时间减少至 3 秒
  // ["skill3", [16000, 1.0]],
  ["skill3", [3000, 1.0]],
  ["skill4", [10000, 1.0]],
  ["skill5", [25000, 1.0]],
  // CHANGE: 设置时间减少至 4 秒
  // ["skill6", [45000, 1.0]],
  ["skill6", [4000, 1.0]],
  ["skill7", [999000, 0.4]],
  ["skill8", [999000, 0.2]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:arcane_axolotl") {
      entity.onTriggerEvent(args.eventId);
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_SKILL1_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        entity.addEffect("slowness", 3 * 20, {
          // CHANGE: 水弹 - 设置时间减少至 3 秒，每颗水弹造成 6 点伤害，并附加 缓慢 II 效果 5 秒
          // amplifier: 1,
          amplifier: 2,
          showParticles: true,
        });
      }
    }
  });

  mc.world.afterEvents.entityHurt.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.hurtEntity.id);
    if (entity && args.hurtEntity.typeId == "sz_workshop:arcane_axolotl") {
      entity.onEntityHurt(args.damage);
    }
  });
}

export class ArcaneAxolotlEntity extends BossEntityBase {
  constructor(entityId) {
    super(entityId);
    if (!IS_ACTIVE) startListenEvent();
  }

  onEntityHurt(damage) {
    // mc.world.sendMessage(`damage: ${damage}`);
    // health = this.entity.getComponent(mc.EntityComponentTypes.Health);
    // mc.world.sendMessage(`remain: ${health.currentValue}`);
  }

  onTriggerEvent(eventId) {
    if (eventId === "event:try_active_ability") this.tryActiveAbility();
  }

  tryActiveAbility() {
    let preTime = Date.now();
    let availableAbility = ["attack1", "attack2"];
    let healthRate = this.getHealthRate();

    ABILITY_COOLDOWN_CONFIG.forEach((config, abilityId) => {
      let [cooldownTime, belowRate] = config;
      if (
        healthRate <= belowRate &&
        (!this.abilityCd.get(abilityId) ||
          preTime - this.abilityCd.get(abilityId) >= cooldownTime)
      )
        availableAbility.push(abilityId);
    });

    let abilityId = zdk.randomChoice(availableAbility);
    if (abilityId === "attack1") this.attack1(abilityId);
    if (abilityId === "attack2") this.attack2(abilityId);
    if (abilityId === "skill1") this.skill1(abilityId);
    if (abilityId === "skill2") this.skill2(abilityId);
    if (abilityId === "skill3") this.skill3(abilityId);
    if (abilityId === "skill4") this.skill4(abilityId);
    if (abilityId === "skill5") this.skill5(abilityId);
    if (abilityId === "skill6") this.skill6(abilityId);
    if (abilityId === "skill7") this.skill7(abilityId);
    if (abilityId === "skill8") this.skill8(abilityId);
  }

  // ● Basic Attack
  // ● Water Manipulation - Arcane axolotl attack with manipulating water around the map.
  // Arcane axolotl will bring water energy particle from the ground and then shoot it to the player.
  // On impact the water will deal 6 damage to player.
  ATTACK1_DURATION = parseInt(1.75 * 20);
  ATTACK1_ATTACK_TIME = parseInt(1.0 * 20);
  ATTACK1_IMPULSE = 0.85;
  attack1(abilityId) {
    this.triggerEvent("event:set_use_attack1");
    this.delayResetAbility(this.ATTACK1_DURATION, 10);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let view_vector = this.entity.getViewDirection();
      let location = this.entity.location;
      let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK1_ID, {
        x: location.x + view_vector.x * 2.0,
        y: location.y + 1.5,
        z: location.z + view_vector.z * 2.0,
      });
      let pjd_comp = projectile.getComponent(
        mc.EntityComponentTypes.Projectile
      );
      pjd_comp?.shoot({
        x: view_vector.x * this.ATTACK1_IMPULSE,
        y: 0.0,
        z: view_vector.z * this.ATTACK1_IMPULSE,
      });
    }, this.ATTACK1_ATTACK_TIME);
  }

  // ● Water Blast - Arcane axolotl will absorb more water around the area and combine it into 1 half block sized water energy
  // and then shoot it to the player.
  // On impact the water will splash creating small explosion with explosive power of 3,
  // deal 6 damage to any entities affected by the attack and explosion, and knock them back by 3 blocks.
  ATTACK2_DURATION = parseInt(1.75 * 20);
  ATTACK2_ATTACK_TIME = parseInt(1.0 * 20);
  ATTACK2_IMPULSE = 0.75;
  attack2(abilityId) {
    this.triggerEvent("event:set_use_attack2");
    this.delayResetAbility(this.ATTACK2_DURATION, 10);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let view_vector = this.entity.getViewDirection();
      let location = this.entity.location;
      let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK2_ID, {
        x: location.x + view_vector.x * 1.6,
        y: location.y + 1.0,
        z: location.z + view_vector.z * 1.6,
      });
      let pjd_comp = projectile.getComponent(
        mc.EntityComponentTypes.Projectile
      );
      pjd_comp?.shoot({
        x: view_vector.x * this.ATTACK2_IMPULSE,
        y: 0.0,
        z: view_vector.z * this.ATTACK2_IMPULSE,
      });
    }, this.ATTACK2_ATTACK_TIME);
  }

  // ● Unique Skill
  // ● Water Missile
  // ○ Arcane Axolotl will charge to collect water from the area for 5 seconds to create 6 floating Water Energy Projectile.
  // After 5 seconds Arcane Axolotl will aim the Water Projectile to the player,
  // the water projectile will fly straight to player and attack the player 1 by 1. Each Water Projectile will deal 5 damage and give Slow II effect for 3 seconds.
  // ○ When the skill is active, execute action bar that says: Avoid the §9Water Missile§r!!
  // ○ This skill will have a cooldown time of 8 seconds.
  SKILL1_DURATION = parseInt(6.75 * 20);
  SKILL1_ATTACK_TIME = parseInt(6.0 * 20);
  SKILL1_PJD_IMPULSE = 1.25;
  skill1(abilityId) {
    this.triggerEvent("event:set_use_skill1");
    this.setPlayerTip(20, "Avoid the §9Water Missile§r!!");
    this.delayResetAbility(this.SKILL1_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL1_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let target = null;
    let testPos = this.entity.location;
    for (let player of this.getRadiusEntity(testPos, 32)) {
      target = player;
      break;
    }

    for (let i = 0; i < 6; i++) {
      mc.system.runTimeout(() => {
        if (!this.entity || !this.entity.isValid()) return;
        let view_vector = this.entity.getViewDirection();
        let location = this.entity.location;
        let direction = view_vector;
        if (target) {
          let targetPos = target.location;
          targetPos.y += 1.5;
          direction = zdk.getPosFacingPosVec(location, targetPos);
        }
        let projectile = this.entity.dimension.spawnEntity(PJD_SKILL1_ID, {
          x: location.x + view_vector.x * 1.25,
          y: location.y + 1.0,
          z: location.z + view_vector.z * 1.25,
        });
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot({
          x: direction.x * this.SKILL1_PJD_IMPULSE,
          y: 0.0,
          z: direction.z * this.SKILL1_PJD_IMPULSE,
        });
      }, this.SKILL1_ATTACK_TIME + i * 10);
    }
  }

  // ● Water Shield
  // ○ Arcane axolotl will bring water from the ground and control it to form a water sphere around the arcane axolotl.
  // The water sphere will be up and will protect Arcane Axolotl from damage up to 20 health damage.
  // After the limit is reach the shield will pop like a bubble releasing a bubble pop particles.
  // ○ This skill will have a cooldown time of 30 seconds.
  // ○ When the skill is active, execute action bar that says: Break the §9Water Shield§r!!
  SKILL2_DURATION = parseInt(2.0 * 20);
  SKILL2_ATTACK_TIME = parseInt(0.54 * 20);
  SKILL2_KNOCK_POWER = [0.75, 0.0];
  skill2(abilityId) {
    this.triggerEvent("event:set_use_skill2");
    this.setPlayerTip(20, "Break the §9Water Shield§r!!");
    this.delayResetAbility(this.SKILL2_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL2_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let ticks = 0;
    let runId = mc.system.runInterval(() => {
      if (!this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }
      let spawnPos = this.entity.location;
      if (ticks >= this.SKILL2_DURATION || !spawnPos) {
        this.clearRun(runId);
        return;
      }
      for (let victim of this.getRadiusEntity(spawnPos, 5)) {
        let direction = zdk.getPosFacingPosVec(spawnPos, victim.location);
        victim.applyKnockback(
          direction.x,
          direction.z,
          this.SKILL2_KNOCK_POWER[0],
          this.SKILL2_KNOCK_POWER[1]
        );
      }
      ticks++;
    }, 1);
    this.addRun(runId);
  }

  // ● Water Jet
  // ○ Arcane axolotl will bring water from the area and combine all of it into a circle,
  // Arcane axolotl will took 5 seconds to get all water needed.
  // After 5 seconds Arcane Axolotl will spray the water from the circle fast like a jet spray (or like a Kamehameha for easier reference).
  // The attack will aimed at the player and will shoot for up to 8 seconds with a range for up to 8 blocks.
  // Each seconds player get hit by the attack player will receive 4 damage per second.
  // The attack will also push player back 1 blocks per second or per damage.
  // ○ This skill will have a cooldown time of 16 seconds.
  // ○ This skill will have an attack range up to 12 blocks from Arcane the Axolotl.
  // ○ When the skill is active, execute action bar that says: Avoid the §Water Jet§r!!
  SKILL3_DURATION = parseInt(15.25 * 20);
  SKILL3_ATTACK_TIME = parseInt(6.5 * 20);
  // CHANGE: 攻击范围内的玩家每秒受到 5 点伤害
  // SKILL3_DAMAGE = 4;
  SKILL3_DAMAGE = 5;
  SKILL3_KNOCK_POWER = [0.3, 0.0];
  skill3(abilityId) {
    this.triggerEvent("event:set_use_skill3");
    this.setPlayerTip(20, "Avoid the §Water Jet§r!!");
    this.delayResetAbility(this.SKILL3_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let endTime = 8 * 20;
      let ticks = 0;
      let runId = mc.system.runInterval(() => {
        if (ticks >= endTime || !this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        let location = this.entity.location;
        let spawnPos = zdk.getPosForward(this.entity, 3);
        for (let victim of this.getRadiusEntity(spawnPos, 8)) {
          let direction = zdk.getPosFacingPosVec(location, victim.location);
          victim.applyKnockback(
            direction.x,
            direction.z,
            this.SKILL3_KNOCK_POWER[0],
            this.SKILL3_KNOCK_POWER[1]
          );
        }

        for (let victim of this.getRadiusEntity(spawnPos, 8)) {
          victim.applyDamage(this.SKILL3_DAMAGE, {
            cause: mc.EntityDamageCause.entityAttack,
            damagingEntity: this.entity,
          });
        }
        ticks++;
      }, 1);
      this.addRun(runId);
    }, this.SKILL3_ATTACK_TIME);
  }

  // ● Geyser Blast
  // ○ Arcane axolotl will control the water and move all the controlled water under the player creating a water circle 4-blocks radius,
  // Arcane Axolotl will concentrate and dense it for 3 seconds and blast the water from the ground creating geyser-like attack.
  // The geyser attack will push the player up to 10 blocks high. After the attack player will fall to the ground and get hit by fall damage.
  // ○ This skill will have a cooldown time of 10 seconds.
  // ○ When the skill is active, execute action bar that says: Geyser will erupt from the ground, run!
  SKILL4_DURATION = parseInt(7.4167 * 20);
  SKILL4_ATTACK_TIME = parseInt(5.75 * 20);
  // CHANGE: 间歇泉爆破 - 冲击伤害提高至 12 点(通过调整冲击高度实现更高的下坠伤害)
  // SKILL4_KNOCK_POWER = 1.5;
  SKILL4_KNOCK_POWER = 1.75;
  skill4(abilityId) {
    this.triggerEvent("event:set_use_skill4");
    this.setPlayerTip(20, "Geyser will erupt from the ground, run!");
    this.delayResetAbility(this.SKILL4_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL4_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 3);
      spawnPos.y = this.entity.location.y;

      for (let victim of this.getRadiusEntity(this.entity.location, 16)) {
        spawnPos = victim.location;
        break;
      }

      // particle
      this.entity.dimension.spawnParticle("sz_workshop:geyser_explosion_02", spawnPos);
      this.entity.dimension.spawnParticle("sz_workshop:geyser_explosion_03", spawnPos);
      this.entity.dimension.spawnParticle("sz_workshop:geyser_explosion_04", spawnPos);
      
      // CHANGE: 间歇泉爆破 - 攻击范围增加至 7 格半径
      // for (let victim of this.getRadiusEntity(spawnPos, 4)) {
      for (let victim of this.getRadiusEntity(spawnPos, 7)) {
        victim.applyKnockback(0, 0, 0.1, this.SKILL4_KNOCK_POWER);
      }
    }, this.SKILL4_ATTACK_TIME);
  }

  // ● Bubble Trap
  // ○ Arcane Axolotl will pull water around the area to the player and will immediately trap player inside the bubble.
  // As long as player inside the Bubble player will be unable to breath. The bubble will last for 6 seconds and then will pop afterward,
  // the pop will deal small 4 damage to the player.
  // ○ This skill will have a cooldown time of 25 seconds.
  // ○ When the skill is active, execute action bar that says: Hold your breath!
  SKILL5_DURATION = parseInt(8.33 * 20);
  SKILL5_ATTACK_TIME = parseInt(7.5 * 20);
  SKILL5_DAMAGE = 4;
  SKILL5_RADIUS = 16;
  skill5(abilityId) {
    this.triggerEvent("event:set_use_skill5");
    this.setPlayerTip(20, "Hold your breath!");
    this.delayResetAbility(this.SKILL5_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL5_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = this.entity.location;
      let dimension = this.entity.dimension;
      for (let victim of this.getRadiusEntity(spawnPos, this.SKILL5_RADIUS)) {
        dimension.spawnEntity(DET_SKILL5_ID, victim.location);
      }
    }, this.SKILL5_ATTACK_TIME);
  }

  // ● Water Whirlpool
  // ○ Arcane Axolotl will control a really wide area of water to create a wide 12-blocks radius of water circle.
  // Arcane Axolotl will charge for 5 seconds to prepare the spell,
  // after 5 seconds a whirlpool with a radius of 12-blocks will rampaging for 8 seconds.
  // For 8 seconds all entities within the radius will be sucked to the center of the whirlpool
  // and get hit by 5 damage per seconds they are in the whirlpool.
  // ○ This skill will have a cooldown time of 45 seconds.
  // ○ When the skill is active, execute action bar that says: Run away from the §9Whirlpool§r!!
  SKILL6_DURATION = parseInt(6 * 20);
  SKILL6_ATTACK_TIME = parseInt(0.5 * 20);
  // CHANGE: 伤害提高至6点每秒
  // SKILL6_DAMAGE = 6;
  SKILL6_DAMAGE = 6;
  SKILL6_KNOCK_POWER = [0.25, 0.0];
  skill6(abilityId) {
    this.triggerEvent("event:set_use_skill6");
    this.setPlayerTip(20, "Run away from the §9Whirlpool§r!!");
    this.delayResetAbility(this.SKILL6_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL6_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let endTime = 5 * 20;
      let ticks = 0;
      let runId = mc.system.runInterval(() => {
        if (!this.entity || !this.entity.isValid()) return;
        let spawnPos = this.entity.location;
        if (ticks >= endTime || !spawnPos) {
          this.clearRun(runId);
          return;
        }
        for (let victim of this.getRadiusEntity(spawnPos, 12)) {
          let direction = zdk.getPosFacingPosVec(victim.location, spawnPos);
          victim.applyKnockback(
            direction.x,
            direction.z,
            this.SKILL6_KNOCK_POWER[0],
            this.SKILL6_KNOCK_POWER[1]
          );
        }

        if (ticks % 20 === 0) {
          // CHANGE: 水漩涡 - 范围扩展至 15 格半径
          // for (let victim of this.getRadiusEntity(spawnPos, 12)) {
          for (let victim of this.getRadiusEntity(spawnPos, 15)) {
            victim.applyDamage(this.SKILL6_DAMAGE);
            victim.addEffect("slowness", 2 * 20, { amplifier: 1 });
          }
        }
        ticks++;
      }, 1);
      this.addRun(runId);
    }, this.SKILL6_ATTACK_TIME);
  }

  // ● Water Army
  // ○ When Arcane Axolotl health reach 40%,
  // It will form an army that made out of water around the area. This skill will spawn 4 Water Swordman, 3 Water Spearman, and 2 Water Archer.
  // ○ This skill will only be used by the Arcane Axolotl once.
  // ○ When the skill is active, execute the action bar that says: Defeat the §9Water Army§r!!
  SKILL7_DURATION = parseInt(1.5 * 20);
  SKILL7_ATTACK_TIME = parseInt(0.5 * 20);
  skill7(abilityId) {
    this.triggerEvent("event:set_use_skill7");
    this.setPlayerTip(20, "Defeat the §9Water Army§r!!");
    this.delayResetAbility(this.SKILL7_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL7_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 3);
      let dimension = this.entity.dimension;
      spawnPos.y = this.entity.location.y + 1.0;

      for (let i = 0; i < 4; i++) {
        dimension.spawnEntity("sz_workshop:water_sword_man", spawnPos);
      }
      for (let i = 0; i < 3; i++) {
        dimension.spawnEntity("sz_workshop:water_spearman", spawnPos);
      }
      for (let i = 0; i < 2; i++) {
        dimension.spawnEntity("sz_workshop:water_archer", spawnPos);
      }
    }, this.SKILL7_ATTACK_TIME);
  }

  // ● Water of Life
  // ○ When Arcane Axolotl health reach 20%, It will fly to the center of the area where the Arcane Axolotl spawn,
  // when Arcane Axolotl reach the place it will start to meditating and cover its body with similar skill as the Water Shield
  // but the shield will hold up to 50 damage. Arcane Axolotl will be in the shield for 15 seconds and regen its health by 8 per second.
  // This skill will be cancelled if player able to break the Water Shield.
  // ○ This skill will only be used by the Arcane Axolotl once.
  // ○ When the skill is active, execute the action bar that says: Arcane Axolotl is healing, break the bubble!
  SKILL8_DURATION = parseInt(15.75 * 20);
  skill8(abilityId) {
    this.triggerEvent("event:set_use_skill8");
    this.setPlayerTip(20, "Arcane Axolotl is healing, break the bubble!");
    this.delayResetAbility(this.SKILL8_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL8_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let health = this.entity.getComponent(mc.EntityComponentTypes.Health);
    let runId = mc.system.runInterval(() => {
      if (!this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }
      health.setCurrentValue(health.currentValue + 8);
      // mc.world.sendMessage(`add health: ${health.currentValue}`);
    }, 20);
    this.addRun(runId);

    let ticks = 0;
    let runId2 = mc.system.runInterval(() => {
      if (ticks >= this.SKILL8_DURATION || !this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        this.clearRun(runId2);
        return;
      }
      let spawnPos = this.entity.location;
      for (let victim of this.getRadiusEntity(spawnPos, 5)) {
        let direction = zdk.getPosFacingPosVec(spawnPos, victim.location);
        victim.applyKnockback(
          direction.x,
          direction.z,
          this.SKILL2_KNOCK_POWER[0],
          this.SKILL2_KNOCK_POWER[1]
        );
      }
      ticks++;
    }, 1);
    this.addRun(runId2);
  }
}
