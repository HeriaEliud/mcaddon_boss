import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;
const PJD_ATTACK1_ID = "sz_workshop:pjd_pharoah_atk1";
const PJD_ATTACK2_ID = "sz_workshop:pjd_pharoah_atk2";
const PJD_SKILL2_ID = "sz_workshop:pjd_pharoah_sk2";
const DET_SKILL3_ID = "sz_workshop:det_pharoah_sk3";

const ABILITY_COOLDOWN_CONFIG = new Map([
  // ["skill1", [12000, 1.0]],
  // CHANGE: 沙尘打击（Dust Strike） - 设置时间减少至 4 秒
  // ["skill2", [12000, 1.0]],
  ["skill2", [4000, 1.0]],
  // CHANGE: 沙尘风暴（Dust Storm） - 设置时间减少至 4 秒
  // ["skill3", [30000, 1.0]],
  ["skill3", [4000, 1.0]],
  ["skill4", [30000, 1.0]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:the_pharoah") {
      entity.onTriggerEvent(args.eventId);
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_ATTACK1_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        if (Math.random() < 0.5) return;
        entity.addEffect("poison", 6 * 20, {
          amplifier: 0,
          showParticles: true,
        });
      }
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_ATTACK2_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        if (Math.random() < 0.5) return;
        entity.addEffect("wither", 6 * 20, {
          amplifier: 0,
          showParticles: true,
        });
      }
    }
  });

  mc.world.afterEvents.projectileHitEntity.subscribe((args) => {
    if (args.projectile.typeId == PJD_SKILL2_ID) {
      let entity = args.getEntityHit().entity;
      if (entity && entity.typeId == "minecraft:player") {
        entity.addEffect("weakness", 6 * 20, {
          amplifier: 1,
          showParticles: true,
        });
      }
    }
  });

  mc.world.afterEvents.entityHurt.subscribe((args) => {
    let victim = args.hurtEntity;
    if (victim.typeId == "sz_workshop:the_pharoah") {
      let source = args.damageSource;
      // mc.world.sendMessage(`victim: ${victim.typeId}, damage: ${args.damage} hasTag: ${victim.hasTag("has_mummy")}`);
      if (source.damagingEntity?.typeId == "minecraft:player") {
        let player = source.damagingEntity;
        if (player && victim.hasTag("has_mummy")) {
          player.runCommand("/title @s actionbar Defeat the Mummies!");
        }
      }
    }
  });
}

export class ThePharoahEntity extends BossEntityBase {
  constructor(entityId) {
    super(entityId);
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

    let abilityId = zdk.randomChoice(availableAbility);
    if (abilityId === "attack1") this.attack1(abilityId);
    if (abilityId === "attack2") this.attack2(abilityId);
    if (abilityId === "skill1") this.skill1(abilityId);
    if (abilityId === "skill2") this.skill2(abilityId);
    if (abilityId === "skill3") this.skill3(abilityId);
    if (abilityId === "skill4") this.skill4(abilityId);
  }
  // Basic Attack
  // ● The Pharoah will unleash 3 dark green projectiles to the player.
  // The projectile will float with slow speed towards the player.
  // If the projectiles hit, the player will be cursed with the Poison II effect for 6 seconds.
  // Each of the projectiles will deal 5 damage.
  ATTACK1_DAMAGE = 5;
  ATTACK1_IMPULSE = 0.35;
  ATTACK1_DURATION = parseInt(1.25 * 20);
  ATTACK1_ATTACK_TIME = parseInt(0.5 * 20);
  attack1(abilityId) {
    this.triggerEvent("event:set_use_attack1");
    this.delayResetAbility(this.ATTACK1_DURATION, 60);

    for (let i = 0; i < 3; i++) {
      mc.system.runTimeout(() => {
        if (!this.entity || !this.entity.isValid()) return;
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
        let view_vector = this.entity.getViewDirection();
        let location = this.entity.location;
        let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK1_ID, {
          x: location.x + view_vector.x * 1.0,
          y: location.y + 1.0,
          z: location.z + view_vector.z * 1.0,
        });
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot({
          x: view_vector.x * this.ATTACK1_IMPULSE,
          y: view_vector.y * this.ATTACK1_IMPULSE,
          z: view_vector.z * this.ATTACK1_IMPULSE,
        });
      }, this.ATTACK1_ATTACK_TIME + i * 5);
    }
  }

  // ● The Pharoah will unleash 3 dark purple projectiles to the player.
  // The projectile will float with slow speed towards the player.
  // If the projectiles hit, the player will be cursed with the Wither II effect for 5 seconds.
  // Each of the projectiles will deal 4 damage.
  ATTACK2_DAMAGE = 4;
  ATTACK2_IMPULSE = 0.35;
  ATTACK2_DURATION = parseInt(1.25 * 20);
  ATTACK2_ATTACK_TIME = parseInt(0.5 * 20);
  attack2(abilityId) {
    this.triggerEvent("event:set_use_attack2");
    this.delayResetAbility(this.ATTACK2_DURATION, 60);

    for (let i = 0; i < 3; i++) {
      mc.system.runTimeout(() => {
        if (!this.entity || !this.entity.isValid()) return;
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
        let view_vector = this.entity.getViewDirection();
        let location = this.entity.location;
        let projectile = this.entity.dimension.spawnEntity(PJD_ATTACK2_ID, {
          x: location.x + view_vector.x * 1.0,
          y: location.y + 1.0,
          z: location.z + view_vector.z * 1.0,
        });
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot({
          x: view_vector.x * this.ATTACK2_IMPULSE,
          y: view_vector.y * this.ATTACK2_IMPULSE,
          z: view_vector.z * this.ATTACK2_IMPULSE,
        });
      }, this.ATTACK2_ATTACK_TIME + i * 5);
    }
  }

  // Awaken
  // ● This skill will active after the player summon The Pharoah using the Pharoah Seal.
  // ● After the player places the Pharoah Seal it will release a thick sand dust particles that will fill the area,
  // after 3 seconds The Pharoah will be spawned and release both basic attack skills at the same time.
  // ● The Pharoah will summon 10 Mummies that will attack the player.
  // ● The Pharoah will launch both basic attack skills at the same time.

  // Shield
  // ● The Pharoah will be covered in shields and all damage will be nullified when there are any mummies that it spawn still alive.
  // ● When the shield skill is active, execute the top action bar that says: Defeat the Mummies!
  // ● This skill will be active after the Pharoah awaken and after releasing the Cursed Cloud skill.
  SKILL1_DURATTION = parseInt(2.0 * 20);
  skill1(abilityId) {
    this.triggerEvent("event:set_use_skill1");
    this.setPlayerTip(30, "Defeat the Mummies!");
    this.delayResetAbility(this.SKILL1_DURATTION, 60);
  }

  // Dust Strike
  // ● The Pharoah will prepare the attack for 6 seconds by pulling small sand particles around the area.
  // After 6 seconds the Pharoah will shoot up to 5 small sized projectiles made out of sand particles at the player.
  // On impact the projectile will explode with explosive power of 1 and deal 4 damage from each projectile to the player.
  // The attack will also curse the player with Weakness II effect for 6 seconds on hit.
  // ● This skill will have a cooldown time of 12 seconds.
  // ● When the Pharoah release this skill, execute action bar that says: Avoid the §6Dust Strike§r!
  SKILL2_DURATION = parseInt(7.25 * 20);
  SKILL2_ATTACK_TIME = parseInt(6.25 * 20);
  SKILL2_POWER = 0.75;
  skill2(abilityId) {
    this.triggerEvent("event:set_use_skill2");
    this.setPlayerTip(30, "Avoid the §6Dust Strike§r!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );
    this.delayResetAbility(this.SKILL2_DURATION, 60);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.runCommand(
        "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
      );
      let view_vector = this.entity.getViewDirection();
      let location = this.entity.location;
      for (let i = 0; i < 5; i++) {
        mc.system.runTimeout(() => {
          let projectile = this.entity.dimension.spawnEntity(PJD_SKILL2_ID, {
            x: location.x + view_vector.x * 1.0,
            y: location.y + 1.0,
            z: location.z + view_vector.z * 1.0,
          });
          let pjd_comp = projectile.getComponent(
            mc.EntityComponentTypes.Projectile
          );
          pjd_comp?.shoot({
            x: view_vector.x * this.SKILL2_POWER,
            y: view_vector.y * this.SKILL2_POWER,
            z: view_vector.z * this.SKILL2_POWER,
          });
        }, i * 5);
      }
    }, this.SKILL2_ATTACK_TIME);
  }

  // Dust Storm
  // ● The Pharoah will prepare the attack for 6 seconds by pulling a huge amount of sand particles around the area into the center of the storm.
  // After 6 seconds the pharoah will start a storm that is made out of sand particles and has an attack radius of 6 blocks.
  // The storm will rage for 10 seconds attacking all entities within the attack radius of the attack.
  // The Storm will follow behind the player around slowly.
  // All entities that are inside the attack radius will get hit by 8 damage per seconds they are inside the storm
  // and will get affected by Slowness I effect for 6 seconds.
  // ● This skill will have a cooldown time of 30 seconds.
  // ● This skill will have an attack radius of 6x6 blocks.
  // ● When the Pharoah release this skill, execute action bar that says: Avoid the §6Dust Storm§r!
  SKILL3_DURATION = parseInt(8.5 * 20);
  SKILL3_ATTACK_TIME = parseInt(6.0 * 20);
  skill3(abilityId) {
    this.triggerEvent("event:set_use_skill3");
    this.setPlayerTip(30, "Avoid the §6Dust Storm§r!");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );
    this.delayResetAbility(this.SKILL3_DURATION, 60);

    mc.system.runTimeout(() => {
      if (!this.entity || !this.entity.isValid()) return;
      let location = this.entity.location;
      this.entity.dimension.spawnEntity(DET_SKILL3_ID, {
        x: location.x,
        y: location.y,
        z: location.z,
      });
    }, this.SKILL3_ATTACK_TIME);
  }

  // Cursed Cloud
  // ● The Pharoah will first roam around the tomb before getting back to the sarcophagus,
  // after it back to the sarcophagus it will release this skill.
  // ● The Pharoah will unleash a huge black cursed cloud particle from its body to fill the room where the Pharoah is.
  // After releasing the attack all the mummies that died inside the room will be resurrected.
  // Players inside the room will get Poison I and Weakened I effect for 6 seconds.
  // ● The Cloud will have a range of cover up to 10-blocks radius.
  // ● After the attack the Pharoah will activate the Shield Skill.
  // ● This skill is a wave skill that has a cooldown time of 30 seconds.
  // 诅咒云（Cursed Cloud） - 更新此技能，使其持续 6 秒
  // SKILL4_DURATION = parseInt(5.0 * 20);
  SKILL4_DURATION = parseInt(6.0 * 20);
  skill4(abilityId) {
    this.triggerEvent("event:set_use_skill4");
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL4_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );
    this.delayResetAbility(this.SKILL4_DURATION, 60);

    // find the box
    let dimension = this.entity.dimension;
    for (let entity of dimension.getEntities({
      location: this.entity.location,
      families: ["the_pharoah_box"],
      maxDistance: 32,
    })) {
      let toLocation = entity.location;
      toLocation.y += 1;
      this.entity.teleport(toLocation);
      break;
    }

    let location = this.entity.location;
    this.entity.dimension.spawnParticle(
      "sz_workshop:pharoah_clouds_01",
      location
    );

    // CHANGE: 当玩家处于该技能范围内时，每秒受到 5 点伤害
    for (let moment = 20; moment < 120; moment += 20) {
      mc.system.runTimeout(()=>{
        dimension.getEntities({
          location: location,
          maxDistance: 10
        })
        .filter(e=>e.typeId==="minecraft:player")
        .forEach(player=>player.applyDamage(5))
      }, moment)
    }

    let spawnNum = 10;
    for (let _ of dimension.getEntities({
      location: this.entity.location,
      families: ["mummy"],
      maxDistance: 32,
    })) {
      spawnNum--;
      if (spawnNum <= 0) break;
    }

    for (let i = 0; i < spawnNum; i++) {
      let spawnLocation = {
        x: location.x + (Math.random() - 1) * 5,
        y: location.y + 1,
        z: location.z + (Math.random() - 1) * 5,
      };
      dimension.spawnEntity("sz_workshop:mummy", spawnLocation);
    }
  }
}
