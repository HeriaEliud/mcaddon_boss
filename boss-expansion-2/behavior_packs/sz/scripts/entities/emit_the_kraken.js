import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;
const PJD_ATTACK2_ID = "sz_workshop:pjd_emit_the_kraken_atk2";
const PJD_SKILL5_ID = "sz_workshop:pjd_emit_the_kraken_sk5";
const DET_BLIND = "sz_workshop:det_emit_the_kraken_blind";

const ABILITY_COOLDOWN_CONFIG = new Map([
  // ["skill1", [12000, 1.0]],
  ["skill2", [12000, 1.0]],
  ["skill3", [30000, 1.0]],
  ["skill4", [30000, 1.0]],
  ["skill5", [30000, 1.0]],
  ["skill6", [999000, 0.1]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:emit_the_kraken") {
      entity.onTriggerEvent(args.eventId);
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_ATTACK2_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        entity.dimension.spawnEntity(DET_BLIND, entity.location);
        //        entity.addEffect("blindness", 5 * 20, {
        //          amplifier: 1,
        //          showParticles: true,
        //        });
      }
    }
  });
}

export class EmitTheKrakenEntity extends BossEntityBase {
  constructor(entityId) {
    super(entityId);
    this.sk1_cd = Date.now() + 30000;
    if (!IS_ACTIVE) startListenEvent();
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

    // sk1 30s
    if (preTime >= this.sk1_cd) {
      this.skill1("skill1");
      return;
    }

    let abilityId = zdk.randomChoice(availableAbility);
    if (abilityId === "attack1") this.attack1(abilityId);
    if (abilityId === "attack2") this.attack2(abilityId);
    // if (abilityId === "skill1") this.skill1(abilityId);
    if (abilityId === "skill2") this.skill2(abilityId);
    if (abilityId === "skill3") this.skill3(abilityId);
    if (abilityId === "skill4") this.skill4(abilityId);
    if (abilityId === "skill5") this.skill5(abilityId);
    if (abilityId === "skill6") this.skill6(abilityId);
  }

  // ● Basic Attack
  // ○ Emit the Kraken will swing its tentacle to the player,
  // on impact the tentacle will hit the player,
  // deal 7 damage and send the player 5 blocks away.
  // CHANGE: 基础攻击 1 - 伤害提升至 12 点
  // ATTACK1_DAMAGE = 7;
  ATTACK1_DAMAGE = 12;
  ATTACK1_ATTACK_TIME = parseInt(1.0 * 20);
  ATTACK1_KNOCK_POWER = [3.0, 0.15];
  ATTACK1_DURATION = parseInt(1.625 * 20);
  attack1(abilityId) {
    this.triggerEvent("event:set_use_attack1");
    this.delayResetAbility(this.ATTACK1_DURATION, 5);

    let active = function* () {
      let knockPos = this.entity.location;
      yield this.ATTACK1_ATTACK_TIME;
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 3);
      for (let victim of this.getRadiusEntity(spawnPos, 12)) {
        zdk.setPosKockback(victim, knockPos, this.ATTACK1_KNOCK_POWER);
        victim.applyDamage(this.ATTACK1_DAMAGE);
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // ○ Emit the Kraken will shoot a small sized ink projectile to the player.
  // On impact the projectile will explode with explosive power of 3 releasing a black smoke particles.
  // The projectile will deal 6 damage and give the player Blindness effect for 5 seconds.
  ATTACK2_IMPULSE = 1.25;
  ATTACK2_DURATION = parseInt(3.0 * 20);
  ATTACK2_ATTACK_TIME = parseInt(1.75 * 20);
  attack2(abilityId) {
    this.triggerEvent("event:set_use_attack2");
    this.delayResetAbility(this.ATTACK2_DURATION, 10);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.runCommand(
        "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
      );
      let view_vector = this.entity.getViewDirection();
      let location = this.entity.location;
      let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK2_ID, {
        x: location.x + view_vector.x * 3.0,
        y: location.y + 1.0,
        z: location.z + view_vector.z * 3.0,
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

  // ● Ink Cloud
  // ○ Once every 30 seconds, Emit the Kraken will release a dense black smoke particle to the area.
  // The Black smoke is so huge that it will cover Emit the Kraken.
  // Every entity that is affected by the black smoke will get the Blindness effect for 15 seconds and Weakness I effect for 5 seconds.
  // ○ The cloud will have a range of 15 blocks radius around Emit the Kraken.
  SKILL1_DURATION = parseInt(3.0 * 20);
  SKILL1_ATTACK_TIME = parseInt(1.0 * 20);
  skill1(abilityId) {
    this.triggerEvent("event:set_use_skill1");
    this.sk1_cd = Date.now() + 50 * this.SKILL1_DURATION + 30000;
    this.delayResetAbility(this.SKILL1_DURATION, 10);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.active_skill1();
    }, this.SKILL1_ATTACK_TIME);
  }

  active_skill1() {
    for (let victim of this.getRadiusEntity(this.entity.location, 15)) {
      // victim.addEffect("blindness", 15 * 20, {
      //   amplifier: 1,
      //   showParticles: true,
      // });
      victim.dimension.spawnEntity(DET_BLIND, victim.location);
      victim.addEffect("weakness", 5 * 20, {
        amplifier: 1,
        showParticles: true,
      });
    }
  }

  // ● Ink Beam
  // ○ Emit the Kraken will prepare the attack for 5 seconds.
  // After 5 seconds it will shoot a beam of ink for 6 seconds towards the player.
  // The beam will deal 5 damage per seconds the player gets hit by the beam and will give the player Blindness I effect for 5 seconds.
  // ○ When Emit the Kraken releases this skill, execute an action bar that says: Avoid the §3Ink Beam§r!
  // ○ This skill will have a range of attack up to 15 blocks from Emit the Kraken.
  // ○ This skill will have a cooldown time of 12 seconds.
  // CHANGE: 墨水光束（Ink Beam） - 伤害提升至 每秒 6 点
  // SKILL2_DAMAGE = 5;
  SKILL2_DAMAGE = 6;
  SKILL2_DURATION = parseInt(12.0 * 20);
  SKILL2_ATTACK_TIME = parseInt(5.0 * 20);
  skill2(abilityId) {
    this.triggerEvent("event:set_use_skill2");
    this.setPlayerTip(20, "Avoid the §3Ink Beam§r!");
    this.delayResetAbility(this.SKILL2_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL2_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let spawnParticlePlayer = [];

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let index = 6;
      let runId = mc.system.runInterval(() => {
        index -= 1;
        if (index < 0 || !this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
        let spawnPos = zdk.getPosForward(this.entity, 5);
        for (let victim of this.getRadiusEntity(spawnPos, 12)) {
          victim.applyDamage(this.SKILL2_DAMAGE);
          if (spawnParticlePlayer.includes(victim)) continue;
          spawnParticlePlayer.push(victim);
          victim.dimension.spawnEntity(DET_BLIND, victim.location);
        }
      }, 20);
      this.addRun(runId);
    }, this.SKILL2_ATTACK_TIME);
  }

  // ● Emit Siphon
  // ○ Emit the Kraken will open its beak mouth wide and then inhale for 6 seconds.
  // For 6 seconds all entities in front of the Emit the Kraken beak will be pulled closer towards Emit.
  // All entities affected by the attack will get hit by 4 damage per seconds they are pulled towards Emit.
  // After 6 seconds Emit will move its beak forward closer to bite all entities in front of the Emit.
  // The Bite will deal 10 damage.
  // ○ This skill will have a range attack of 6x12 blocks in front of Emit the Kraken.
  // ○ When Emit the Kraken releases this skill, execute an action bar that says: Get Away from §6Emit the Kraken§r!
  // ○ This skill will have a cooldown time of 30 seconds.
  //CHANGE: 深渊虹吸（Emit Siphon） - 拉扯伤害提升至 每秒 5 点，咬合伤害提升至 12 点
  // SKILL3_DAMAGE = 4;
  // SKILL3_DAMAGE2 = 10;
  SKILL3_DAMAGE = 5;
  SKILL3_DAMAGE2 = 12;
  SKILL3_DURATION = parseInt(8.0 * 20);
  SKILL3_ATTACK_TIME = parseInt(0.75 * 20);
  SKILL3_ATTACK2_TIME = parseInt(7.42 * 20);
  SKILL3_PULL_POWER = [0.2, 0.0];
  skill3(abilityId) {
    this.triggerEvent("event:set_use_skill3");
    this.setPlayerTip(20, "Get Away from §6Emit the Kraken§r!");
    this.delayResetAbility(this.SKILL2_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let ticks = 0;
      let duration_ticks = 6 * 20;
      let runId = mc.system.runInterval(() => {
        if (!this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        let targetPos = this.entity.location;
        if (!targetPos) {
          this.clearRun(runId);
          return;
        }
        let spawnPos = zdk.getPosForward(this.entity, 6);
        let useDamage = ticks % 20 == 0;
        for (let victim of this.getRadiusEntity(spawnPos, 12)) {
          let vec = zdk.getPosFacingPosVec(victim.location, targetPos);
          victim.applyKnockback(
            vec.x,
            vec.z,
            this.SKILL3_PULL_POWER[0],
            this.SKILL3_PULL_POWER[1]
          );
          if (useDamage) victim.applyDamage(this.SKILL3_DAMAGE);
        }
        ticks++;
        duration_ticks--;
        if (duration_ticks < 0) {
          this.clearRun(runId);
        }
      }, 1);
      this.addRun(runId);
    }, this.SKILL3_ATTACK_TIME);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 4);
      for (let victim of this.getRadiusEntity(spawnPos, 6)) {
        victim.applyDamage(this.SKILL3_DAMAGE2);
      }
    }, this.SKILL3_ATTACK2_TIME);
  }

  // ● Emit Ensnare
  // ○ Emit the kraken will use its tentacle to catch the player.
  // Player will not get hit by any damage if the player does not get hit by this skill.
  // ○ Players that get caught will be pulled towards the Emit Beak and not be able to get off.
  // After being pulled towards the Emit Beak player will get bitten and get hit by 12 damage.
  // After biting, Emit the Kraken will throw the player 10 blocks away.
  // ○ When Emit the Kraken releases this skill, execute an action bar that says: Get Away from §6Emit the Kraken§r!
  // ○ This skill will have a cooldown time of 30 seconds.
  // CHANGE: 深渊缠绕（Emit Ensnare） - 咬合伤害提升至 15 点
  // SKILL4_DAMAGE = 12;
  SKILL4_DAMAGE = 15;
  SKILL4_DURATION = parseInt(4.75 * 20);
  SKILL4_ATTACK_TIME = parseInt(1.0 * 20);
  SKILL4_KNOCK_POWER = [8.0, 0.65];
  skill4(abilityId) {
    this.triggerEvent("event:set_use_skill4");
    this.setPlayerTip(20, "Get Away from §6Emit the Kraken§r!");
    this.delayResetAbility(this.SKILL4_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL4_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let target = null;
      let spawnPos = zdk.getPosForward(this.entity, 6);
      for (let victim of this.getRadiusEntity(spawnPos, 8)) {
        target = victim;
      }

      if (!target) return;

      let endTick = parseInt(20 * 2.75);
      let attackTick = 20 * 1;
      let ticks = 0;
      let runId = mc.system.runInterval(() => {
        ticks++;
        if (!this.entity || !this.entity.isValid()) {
          this.clearRun(runId);
          return;
        }
        if (ticks > endTick) {
          if (target) {
            let direction = target.getViewDirection();
            target.applyKnockback(
              -direction.x,
              -direction.z,
              this.SKILL4_KNOCK_POWER[0],
              this.SKILL4_KNOCK_POWER[1]
            );
          }
          this.clearRun(runId);
          return;
        }
        if (this.entity && target && ticks == attackTick) {
          target.applyDamage(this.SKILL4_DAMAGE);
        }
        if (this.entity && target) {
          let toPos = zdk.getPosForward(this.entity, 4);
          toPos.y = this.entity.location.y + 0.5;
          target.teleport(toPos);
        }
      }, 1);
      this.addRun(runId);
    }, this.SKILL4_ATTACK_TIME);
  }

  //   ● Coral Strike
  //   ○ Emit the Kraken will do a grabbing animation on the ground to grab an enormous coral projectile.
  //   After grabbing the coral, Emit the Kraken will throw the coral towards the player,
  //   sending an enormous coral flying to the player.
  //   On impact the coral will explode with explosive power of 5,
  //   releasing a coral explosion animation,
  //   and deal 12 damage to all entities affected by the explosion.
  //   ○ When Emit the Kraken releases this skill, execute an action bar that says: Dodge the incoming §bCoral Strike§r!
  //   ○ This skill will have a cooldown time of 30 seconds.
  SKILL5_DURATION = parseInt(1.833 * 20);
  SKILL5_ATTACK_TIME = parseInt(1.0 * 20);
  SKILL5_PJD_POWER = 1.5;
  skill5(abilityId) {
    this.triggerEvent("event:set_use_skill5");
    this.setPlayerTip(20, "Dodge the incoming §bCoral Strike§r!");
    this.delayResetAbility(this.SKILL5_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL5_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let view_vector = this.entity.getViewDirection();
      let location = this.entity.location;
      let projectile = this.entity.dimension.spawnEntity(PJD_SKILL5_ID, {
        x: location.x + view_vector.x * 3.5,
        y: location.y + 3.0,
        z: location.z + view_vector.z * 3.5,
      });
      projectile.applyImpulse({
        x: view_vector.x * this.SKILL5_PJD_POWER,
        y: 0.0,
        z: view_vector.z * this.SKILL5_PJD_POWER,
      });
    }, this.SKILL5_ATTACK_TIME);
  }

  // ● Emit Rampage
  // ○ When Emit the Kraken health reaches 10%, It will release this skill.
  // ○ Emit the Kraken will shake and slam all of its tentacles furiously to the area
  // while using the Emit Siphon and releasing the Ink Cloud skill.
  // The furious tentacle slam will deal 12 damage to all entities that get hit by the tentacle.
  // ○ Emit the Kraken will release this skill only once.
  // ○ When Emit the Kraken releases this skill, execute an action bar that says: §6Emit the Kraken§r is on rampage, run!
  SKILL6_DAMAGE = 12;
  SKILL6_DURATION = parseInt(1.0833 * 20);
  SKILL6_ATTACK_TIME = parseInt(0.29 * 20);
  skill6(abilityId) {
    this.triggerEvent("event:set_use_skill6");
    this.setPlayerTip(20, "§6Emit the Kraken§r is on rampage, run!");
    this.delayResetAbility(this.SKILL6_DURATION, 10);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL6_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      for (let victim of this.getRadiusEntity(this.entity.location, 18)) {
        victim.applyDamage(this.SKILL6_DAMAGE);
      }
      this.active_skill1();
    }, this.SKILL6_ATTACK_TIME);
  }
}
