import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;
const PJD_ATTACK2_ID = "sz_workshop:pjd_cosmo_the_oculus_atk2";
const PJD_SKILL2_ID = "sz_workshop:pjd_cosmo_the_oculus_sk2";
const PJD_SKILL3_ID = "sz_workshop:pjd_cosmo_the_oculus_sk3";
const PJD_SKILL4_ID = "sz_workshop:pjd_cosmo_the_oculus_sk4";
const DET_SKILL5_ID = "sz_workshop:det_cosmo_the_oculus_sk5";
const SKILL5_EFFECT = [
  "speed",
  "haste",
  "strength",
  "regeneration",
  "absorption",
  "resistance",
];
const ABILITY_COOLDOWN_CONFIG = new Map([
  // ["skill1", [12000, 1.0]],  // 被动触发
  // CHANGE: 宇宙射线（Cosmo Ray） - 充能时间减少至 4 秒，伤害提升至 每秒 6 点
  // ["skill2", [12000, 1.0]],
  ["skill2", [4000, 1.0]],
  ["skill3", [18000, 1.0]],
  ["skill4", [18000, 1.0]],
  ["skill5", [30000, 1.0]],
  ["skill6", [999000, 0.1]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:cosmo_the_oculus") {
      entity.onTriggerEvent(args.eventId);
    }
  });

  mc.world.afterEvents.entityHurt.subscribe((args) => {
    let entity = args.hurtEntity;
    if (entity && entity.typeId == "sz_workshop:cosmo_the_oculus") {
      let bossEntity = BOSS_ENTITY_MAP.get(entity.id);
      if (bossEntity) {
        bossEntity.onHurt();
      }
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_ATTACK2_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        entity.addEffect("weakness", 4 * 20, { amplifier: 0 });
        entity.addEffect("slowness", 4 * 20, { amplifier: 0 });
      }
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_SKILL3_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        entity.addEffect("weakness", 3 * 20, { amplifier: 1 });
      }
    }
  });

  mc.system.afterEvents.scriptEventReceive.subscribe((args) => {
    if (
      args.id === "boss_expansion:det_cosmo_the_oculus_sk5" &&
      args.message === "on_buff"
    ) {
      let entity = args.sourceEntity;
      let effectId = zdk.randomChoice(SKILL5_EFFECT);
      for (let player of entity.dimension.getEntities({
        location: entity.location,
        families: ["player"],
        maxDistance: 3,
      })) {
        player.addEffect(effectId, 10 * 20, { amplifier: 1 });
      }
    }
  });
}

export class CosmoTheOculusEntity extends BossEntityBase {
  hurtTime = 0;
  constructor(entityId) {
    super(entityId);
    this.hurtTime = 0;
    if (!IS_ACTIVE) startListenEvent();
  }

  onHurt() {
    this.hurtTime++;
    // mc.world.sendMessage(`hurt time: ${this.hurtTime}`);
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

    if (this.hurtTime >= 16) {
      this.hurtTime = 0;
      this.skill1("skill1");
      return;
    }

    let abilityId = zdk.randomChoice(availableAbility);
    if (abilityId === "attack1") this.attack1(abilityId);
    if (abilityId === "attack2") this.attack2(abilityId);
    if (abilityId === "skill1") this.skill1(abilityId);
    if (abilityId === "skill2") this.skill2(abilityId);
    if (abilityId === "skill3") this.skill3(abilityId);
    if (abilityId === "skill4") this.skill4(abilityId);
    if (abilityId === "skill5") this.skill5(abilityId);
    if (abilityId === "skill6") this.skill6(abilityId);
  }
  // Behavior
  // Cosmo The Oculus is a hostile boss with many attack skill and some unique skill.
  // ● Cosmo the Oculus can be spawned by placing the Oculus Seal on the ground after sunset or at night.
  // ● Cosmo the Oculus moves by floating above the ground not too high and can only be attacked by a player using the bow.
  // ● Cosmo will float around if not attacking and will lock solid in place when charging attack and attacking.
  // ● Cosmo will come down to the ground after every 16 successful attacks from the player. Cosmo will close its eye and stay on the ground to recover for 10 seconds.
  // ● After 10 seconds of recovering, Cosmo will exude a powerful energy that deals damage to its surroundings and get back to flying to the sky.
  // ● If Cosmo The Oculus’s health is full after sunrise, it will de-spawn. If its health is not full after sunrise, player will need to defeat it.

  // ● Basic Attack
  // ● Cosmo will charge its eye for 2 seconds, its pupil will glow with purple color,
  // and then shoot a small purple energy beam towards the player.
  // The energy beam will deal 7 damage to the player and explode on impact with explosive power of 4.
  // ○ Attack range: up to 12 blocks from Cosmo.
  ATTACK1_DURATION = parseInt(3.5 * 20);
  ATTACK1_ATTACK_TIME = parseInt(2.75 * 20);
  // CHANGE: 基础攻击 1 - 伤害提升至 8 点
  // ATTACK1_DAMAGE = 7;
  ATTACK1_DAMAGE = 8;
  ATTACK1_MAX_RANGE = 24;
  ATTACK1_EXPOLSION_POWER = 1;
  attack1(abilityId) {
    this.triggerEvent("event:set_use_attack1");
    this.delayResetAbility(this.ATTACK1_DURATION, 10);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.runCommand(
        "/execute as @s facing entity @p feet run tp @s ~ ~ ~ ~ ~"
      );
      let location = this.entity.location;
      location.y += 1.5;
      let direction = this.entity.getViewDirection();
      let dimension = this.entity.dimension;

      const hits = dimension.getEntitiesFromRay(location, direction, {
        includeLiquidBlocks: true,
        includePassableBlocks: true,
        ignoreBlockCollision: false,
        maxDistance: this.ATTACK1_MAX_RANGE,
      });

      for (let { entity: hit, distance: dist } of hits) {
        if (hit.typeId == "minecraft:player") {
          hit.applyDamage(this.ATTACK1_DAMAGE, {
            cause: mc.EntityDamageCause.entityAttack,
            damagingEntity: this.entity,
          });
          dimension.createExplosion(hit.location, this.ATTACK1_EXPOLSION_POWER);
        }
      }
    }, this.ATTACK1_ATTACK_TIME);
  }

  setFacingEntity(entity) {
    let location = this.entity.location;
    let target_location = entity.location;
    let view_vector = zdk.vec_normalize(zdk.vec_sub(target_location, location));
    let yaw = Math.atan2(view_vector.z, view_vector.x) * (180 / Math.PI) - 90;
    let pitch = Math.asin(view_vector.y) * (180 / Math.PI);
    this.entity.setRotation({ x: pitch, y: yaw });
  }

  // ● Cosmo will charge its eye for 2 seconds, its pupil will glow with red color,
  // and then shoot a small red crystal towards the player.
  // The crystal on impact will deal 7 damage to the player and give Weakness I and Slowness I effect for 4 seconds.
  // ○ Attack range: up to 12 block from Cosmo.
  ATTACK2_DURATION = parseInt(3.5 * 20);
  ATTACK2_ATTACK_TIME = parseInt(2.75 * 20);
  // CHANGE: 基础攻击 2 - 伤害提升至 8 点
  // ATTACK2_DAMAGE = 7;
  ATTACK2_DAMAGE = 8;
  ATTACK2_MAX_RANGE = 12;
  ATTACK2_MOTION_POWER = 1.25;
  attack2(abilityId) {
    this.triggerEvent("event:set_use_attack2");
    this.delayResetAbility(this.ATTACK2_DURATION, 10);

    let target = null;
    for (let entity of this.getRadiusEntity(this.entity.location, 24)) {
      if (entity.typeId == "minecraft:player") {
        target = entity;
        break;
      }
    }

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let location = this.entity.location;
      let view_vector = this.entity.getViewDirection();
      let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK2_ID, {
        x: location.x + view_vector.x * 1.5,
        y: location.y + view_vector.x * 1.5 + 1.5,
        z: location.z + view_vector.z * 1.5,
      });
      let pjd_comp = projectile.getComponent(
        mc.EntityComponentTypes.Projectile
      );
      let vec = view_vector;
      if (target) {
        vec = zdk.getPosFacingPosVec(
          projectile.location,
          zdk.vec_add(target.location, { x: 0, y: 1.5, z: 0 })
        );
        // mc.world.sendMessage(`vec: ${JSON.stringify(vec)}`);
      }
      vec = zdk.vec_scale(vec, this.ATTACK2_MOTION_POWER);
      pjd_comp?.shoot(vec);
    }, this.ATTACK2_ATTACK_TIME);
  }

  // ● Unique Skill
  // ○ Cosmo Recovery
  // ■ Cosmo will get into weak state after every 16 successful attack with Bow,
  // it will get down to the ground and stay on the ground for 10 seconds to recover.
  // After 10 seconds Cosmo will back into normal state and
  SKILL1_DURATION = parseInt(10.5 * 20);
  skill1(abilityId) {
    this.triggerEvent("event:set_use_skill1");
    this.delayResetAbility(this.SKILL1_DURATION, 10);

    this.entity.clearVelocity();
    this.entity.applyImpulse({ x: 0, y: -0.5, z: 0 });

    let ticks = 0;
    let runId = mc.system.runInterval(() => {
      if (!this.entity || !this.entity.isValid()) {
        this.clearRun(runId);
        return;
      }
      if (ticks % 10 == 0 || !this.entity || !this.entity.isValid()) {
        this.entity.applyImpulse({ x: 0, y: -0.5, z: 0 });
        return;
      }
      ticks++;
    }, 5);
    this.addRun(runId);
    mc.system.runTimeout(() => {
      this.clearRun(runId);
      if (!this.entity || !this.entity.isValid()) return;
      this.hurtTime = 0;
    }, this.SKILL1_DURATION);
  }

  // ○ Cosmo Ray
  // ■ Cosmo will charge its eye for 6 seconds, when charging its body will be covered in light purpe particles,
  // changing its pupil color into Light Purple and then shoot a Light Purple ray of light aimed towards the player,
  // the ray will have a size of 5 blocks wide and height,
  // Cosmo will shoot the ray for 8 seconds and will follow where the player moves around to force the player to move.
  // All entities affected by the ray will get hit by 5 damage per seconds.
  // ■ This skill will have a cooldown time of 12 seconds.
  // ■ This skill will have an attack range up to 18 blocks from Cosmo.
  // ■ When the skill is active, execute the top action bar that says: Run from the §dCosmo Ray§r!!
  SKILL2_DURATION = parseInt(6.75 * 20);
  SKILL2_ATTACK_TIME = parseInt(6.13 * 20);
  SKILL2_MAX_RANGE = 18;
  // CHANGE: 宇宙射线（Cosmo Ray） - 充能时间减少至 4 秒，伤害提升至 每秒 6 点
  // SKILL2_DAMAGE = 5;
  SKILL2_DAMAGE = 6;
  skill2(abilityId) {
    this.triggerEvent("event:set_use_skill2");
    this.delayResetAbility(this.SKILL2_DURATION, 10);
    this.setPlayerTip(30, "Run from the §dCosmo Ray§r!!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL2_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill2_trigger();
    }, this.SKILL2_ATTACK_TIME);
  }

  skill2_trigger() {
    if (!this.entity || !this.entity.isValid()) return;
    this.entity.runCommand(
      "/execute as @s facing entity @p feet run tp @s ~ ~ ~ ~ ~"
    );
    let location = this.entity.location;
    location.y += 1.5;
    let direction = this.entity.getViewDirection();
    let dimension = this.entity.dimension;

    const hits = dimension.getEntitiesFromRay(location, direction, {
      includeLiquidBlocks: true,
      includePassableBlocks: true,
      ignoreBlockCollision: false,
      maxDistance: this.SKILL2_MAX_RANGE,
    });

    for (let { entity: hit, distance: dist } of hits) {
      if (hit.typeId == "minecraft:player") {
        hit.applyDamage(this.SKILL2_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }
  }

  // ○ Crystal Beam
  // ■ Cosmo will charge its eye for 5 seconds, changing its pupil color into Red Purple.
  // After 5 seconds the Cosmo will spawn 6 large sharp red purple crystal projectiles with a size of 4 blocks tall and 1 blocks wide.
  // Cosmo will then aim at the player to shoot all the projectiles towards the player.
  // The projectile will then one by one fly towards the player.
  // On impact the projectile will explode with explosive power of 5 (will not break any blocks) and release a crystal explosion particle.
  // The projectile will deal damage to all entities affected by the explosion,
  // it deals 8 damage and gives Weakness II effect for 3 seconds.
  // ■ This skill will have a cooldown time of 18 seconds.
  // ■ This skill will have an attack range up to 18 blocks from Cosmo
  // ■ When Cosmo charges up, execute the top action bar that says: Dodge the §dCrystal§r!!
  SKILL3_DURATION = parseInt(5.75 * 20);
  SKILL3_ATTACK_TIME = parseInt(5.0 * 20);
  SKILL3_IMPULSE = 1.75;
  skill3(abilityId) {
    this.triggerEvent("event:set_use_skill3");
    this.delayResetAbility(this.SKILL3_DURATION, 10);
    this.setPlayerTip(30, "Dodge the §dCrystal§r!!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill3_trigger();
    }, this.SKILL3_ATTACK_TIME);
  }

  skill3_trigger() {
    for (let i = 0; i < 6; i++) {
      mc.system.runTimeout(() => {
        if (!this.entity || !this.entity.isValid()) return;
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
        let view_vector = this.entity.getViewDirection();
        let location = this.entity.location;
        let projectile = this.entity.dimension.spawnEntity(PJD_SKILL3_ID, {
          x: location.x + view_vector.x * 1.75,
          y: location.y + 0.5,
          z: location.z + view_vector.z * 1.75,
        });
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot({
          x: view_vector.x * this.SKILL3_IMPULSE,
          y: view_vector.y * this.SKILL3_IMPULSE,
          z: view_vector.z * this.SKILL3_IMPULSE,
        });
      }, i * 5);
    }
  }

  // ○ Siphon Ray
  // ■ Cosmo will charge its eye for 6 seconds, changing its pupil color into Dark Purple.
  // After 6 seconds Cosmo will shoot a Dark Purple ray of light aimed towards the player,
  // the ray will have a size of 5 blocks wide and height.
  // Cosmo will shoot the ray for 8 seconds and the attack will follow where the player is.
  // Entities that are affected by the ray will get Weakness II and Slowness II effects for 8 seconds.
  // The ray will deal 3 damage for every second entities are hit by the ray.
  // If the ray hits any entities Cosmo will get Strength II effect for 8 seconds.
  // ■ This skill will have a cooldown time of 18 seconds.
  // ■ This skill will have an attack range up to 18 blocks from Cosmo.
  // ■ When the skill is active, execute the top action bar that says: Run from the §dSiphon Ray§r!!
  SKILL4_DURATION = parseInt(6.75 * 20);
  SKILL4_ATTACK_TIME = parseInt(6.13 * 20);
  SKILL4_MAX_RANGE = 18;
  // CHANGE: 虹吸射线（Siphon Ray） - 射线伤害提升至 5 点
  // SKILL4_DAMAGE = 3;
  SKILL4_DAMAGE = 5;
  skill4(abilityId) {
    this.triggerEvent("event:set_use_skill4");
    this.delayResetAbility(this.SKILL4_DURATION, 10);
    this.setPlayerTip(30, "Run from the §dSiphon Ray§r!!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL4_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill4_trigger();
    }, this.SKILL4_ATTACK_TIME);
  }

  skill4_trigger() {
    if (!this.entity || !this.entity.isValid()) return;
    this.entity.runCommand(
      "/execute as @s facing entity @p feet run tp @s ~ ~ ~ ~ ~"
    );
    let location = this.entity.location;
    location.y += 1.5;
    let direction = this.entity.getViewDirection();
    let dimension = this.entity.dimension;

    const hits = dimension.getEntitiesFromRay(location, direction, {
      includeLiquidBlocks: true,
      includePassableBlocks: true,
      ignoreBlockCollision: false,
      maxDistance: this.SKILL4_MAX_RANGE,
    });

    for (let { entity: hit, distance: dist } of hits) {
      if (hit.typeId == "minecraft:player") {
        this.entity.addEffect("strength", 8 * 20, {
          amplifier: 1,
          showParticles: true,
        });
        hit.applyDamage(this.SKILL4_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }
  }

  // ○ Cosmo Crystal
  // ■ Cosmo will charge its eye for 6 seconds, changing the tendrils color behind its back into Red,
  // after 6 seconds Cosmo will release a huge energy particle around its eye to spawn up to 12 crystals within 12-blocks radius around the Cosmo.
  // The crystal will float above the ground, and the player will be able to break the crystal with 3 hits.
  // The crystal can be broken with 2 hit,
  // Players will get random buff effects from breaking any of the crystals
  // (Speed II, Haste II, Strength II, Regeneration II, Absorption II, or Resistance II).
  // Crystal that player can’t break after 12 seconds will explode with explosive power of 5 and deal 8 damage to the area.
  // ■ This skill will have a cooldown time of 30 seconds.
  // ■ When the skill is active, execute the top action bar that says: Break or Avoid the §dCrystal§r!!

  SKILL5_DURATION = parseInt(7.5 * 20);
  SKILL5_ATTACK_TIME = parseInt(6.5 * 20);
  skill5(abilityId) {
    this.triggerEvent("event:set_use_skill5");
    this.delayResetAbility(this.SKILL5_DURATION, 10);
    this.setPlayerTip(30, "Break or Avoid the §dCrystal§r!!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL5_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      this.skill5_trigger();
    }, this.SKILL5_ATTACK_TIME);
  }

  skill5_trigger() {
    if (!this.entity || !this.entity.isValid()) return;
    let dimension = this.entity.dimension;
    let spawnPos = this.entity.location;
    for (let i = 0; i < 12; i++) {
      dimension.spawnEntity(DET_SKILL5_ID, spawnPos);
    }
    this.entity.runCommand(`spreadplayers ~ ~ 3 12 @e[type=${DET_SKILL5_ID}]`);
  }

  // ○ Cosmo Rampage
  // ■ Cosmo will use this skill when its health is below 10% and only be used once.
  // ■ Cosmo will stay still and charge its eye for 12 seconds, changing its pupil color into Purple and the tendrils color into purple.
  // After 12 seconds cosmo will release Cosmo Ray, Crystal Beam, and Cosmo Crystal skill at the same time.
  // The damage and the effect of the skill is the same as the description above.
  // ■ When the skill is active, execute the top action bar that says: Cosmo is on rampage, Run!!
  SKILL6_DURATION = parseInt(15.5 * 20);
  SKILL6_ATTACK_TIME1 = parseInt(12.08 * 20);
  SKILL6_ATTACK_TIME2 = parseInt(12.83 * 20);
  SKILL6_ATTACK_TIME3 = parseInt(14.25 * 20);
  skill6(abilityId) {
    this.triggerEvent("event:set_use_skill6");
    this.delayResetAbility(this.SKILL6_DURATION, 10);
    this.setPlayerTip(30, "Cosmo is on rampage, Run!!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL6_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill2_trigger();
    }, this.SKILL6_ATTACK_TIME1);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill4_trigger();
    }, this.SKILL6_ATTACK_TIME2);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.skill5_trigger();
    }, this.SKILL6_ATTACK_TIME3);
  }
}
