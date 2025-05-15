import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { BossEntityBase, BOSS_ENTITY_MAP } from "./base";

var IS_ACTIVE = false;

const ABILITY_COOLDOWN_CONFIG = new Map([
  ["skill1", [12000, 1.0]],
  ["skill2", [16000, 1.0]],
  ["skill3", [16000, 1.0]],
  ["skill4", [12000, 1.0]],
  ["skill5", [8000, 1.0]],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((args) => {
    let entity = BOSS_ENTITY_MAP.get(args.entity.id);
    if (entity && args.entity.typeId == "sz_workshop:the_champ") {
      entity.onTriggerEvent(args.eventId);
    }
  });
}

export class TheChampEntity extends BossEntityBase {
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
    if (abilityId === "skill5") this.skill5(abilityId);
  }

  // ● Basic Attack
  // ○ The Champ will throw a fast and quick punch to the player face, deal 8 and knock the player back by 4 blocks.
  // ○ The Champ will swing its leg and kick the player, deal 8 damage and knock the player back by 4 blocks.
  // ● Body Lock
  ATTACK_KNOCK_POWER = [2.5, 0.15];
  // CHANGE: 基础攻击 1 - 伤害提升至 12 点
  // ATTACK1_DAMAGE = 8;
  ATTACK1_DAMAGE = 12;
  ATTACK1_DURATION = parseInt(0.875 * 20);
  ATTACK1_ATTACK_TIME = parseInt(0.3 * 20);

  attack1(abilityId) {
    this.triggerEvent("event:set_use_attack1");
    this.delayResetAbility(this.ATTACK1_DURATION, 5);

    let active = function* () {
      let knockPos = this.entity.location;
      this.impuseForward(this.entity, 1.5);
      yield this.ATTACK1_ATTACK_TIME;
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 1);
      for (let victim of this.getRadiusEntity(spawnPos, 3)) {
        zdk.setPosKockback(victim, knockPos, this.ATTACK_KNOCK_POWER);
        victim.applyDamage(this.ATTACK1_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // CHANGE: 基础攻击 2 - 伤害提升至 12 点
  // ATTACK2_DAMAGE = 8;
  ATTACK2_DAMAGE = 12;
  ATTACK2_DURATION = parseInt(1.25 * 20);
  ATTACK2_ATTACK_TIME = parseInt(0.5 * 20);

  attack2(abilityId) {
    this.triggerEvent("event:set_use_attack2");
    this.delayResetAbility(this.ATTACK2_DURATION, 5);

    let active = function* () {
      yield this.ATTACK2_ATTACK_TIME - 4;
      this.impuseForward(this.entity, 1.5);
      let knockPos = this.entity.location;
      yield 5;
      if (!this.entity || !this.entity.isValid()) return;
      let spawnPos = zdk.getPosForward(this.entity, 1);
      for (let victim of this.getRadiusEntity(spawnPos, 3)) {
        zdk.setPosKockback(victim, knockPos, this.ATTACK_KNOCK_POWER);
        victim.applyDamage(this.ATTACK2_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }
  // ○ The Champ will open its hand wide, run towards the player and hug the player.
  // If the player gets caught the player will get hit by 7 damage per seconds the player hugged.
  // The Champ will hold the player for up to 6 seconds if the player is not trying to break free.
  // Players will be able to break free by pressing jump repeatedly.
  // ○ Execute an action bar that says: “Press jump repeatedly to break free!”
  // ○ This skill will have a cooldown time of 12 seconds
  // ● Body Slam
  // CHANGE: 震地猛击（Body Slam） - 该技能的范围伤害提升至 12 点
  // SKILL1_DAMAGE = 7;
  SKILL1_DAMAGE = 12;
  SKILL1_KNOCK_FORWARD_POWER = 0.3;
  skill1(abilityId) {
    this.entity.triggerEvent("event:set_use_skill1");
    this.setPlayerTip(20, "Press jump repeatedly to break free!");

    let ticks = 4 * 20;
    let runId = mc.system.runInterval(() => {
      ticks--;
      if (ticks <= 0 || !this.entity || !this.entity.isValid()) {
        if (this.entity) {
          this.entity
            .getComponent(mc.EntityRideableComponent.componentId)
            .ejectRiders();
          this.delayResetAbility(5);
          this.abilityCd.set(
            abilityId,
            Date.now() + ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
          );
        }
        this.clearRun(runId);
        return;
      }

      if (ticks % 10 == 0) {
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
      }

      this.impuseForward(this.entity, this.SKILL1_KNOCK_FORWARD_POWER);

      let riders = this.entity
        .getComponent(mc.EntityRideableComponent.componentId)
        .getRiders();
      if (riders && ticks % 20 === 0) {
        for (let rider of riders) {
          rider.applyDamage(this.SKILL1_DAMAGE);
        }
      } else {
        let spawnPos = zdk.getPosForward(this.entity, 1);
        for (let victim of this.getRadiusEntity(spawnPos, 2)) {
          this.entity
            .getComponent(mc.EntityRideableComponent.componentId)
            .addRider(victim);
          return;
        }
      }
    }, 1);
    this.addRun(runId);
  }

  // ○ The Champ will jump up to 5 blocks above the player before slamming its body down to the ground.
  // The slam will create an explosion with an explosive power of 6, deal 10 damage to all entities affected by the explosion
  // and knock them back 5 blocks away.
  // ○ On impact the body slam will release an explosion of blocks particles around The Champ.
  // ○ Execute an action bar that says: “Avoid the Body Slam!”
  // ○ This skill will have a cooldown time of 16 seconds.
  // ● Player Slam
  // CHANGE: 玩家猛击（Player Slam） - 对玩家的伤害提升至 12 点
  // SKILL2_DAMAGE = 10;
  SKILL2_DAMAGE = 12;
  SKILL2_DURATION = parseInt(2.25 * 20);
  SKILL2_KNOCK_POWER = [6.0, 0.15];
  skill2(abilityId) {
    this.entity.triggerEvent("event:set_use_skill2");
    this.setPlayerTip(20, "Avoid the Body Slam!");
    this.delayResetAbility(this.SKILL2_DURATION, 5);

    let vec = this.entity.getViewDirection();
    vec = { x: vec.x, y: 0.85, z: vec.z };

    this.entity.addEffect("slow_falling", 2);

    let active = function* () {
      yield parseInt(0.4 * 20);
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.applyImpulse(vec);
      yield 6;
      if (!this.entity || !this.entity.isValid()) return;
      vec.x *= 0.5;
      vec.y = -2;
      vec.z *= 0.5;
      this.entity.applyImpulse(vec);
      yield 8;
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.runCommand("/particle minecraft:huge_explosion_emitter ~~~");
      let knockPos = this.entity.location;
      for (let victim of this.getRadiusEntity(knockPos, 6)) {
        zdk.setPosKockback(victim, knockPos, this.SKILL2_KNOCK_POWER);
        victim.applyDamage(this.SKILL2_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // ○ The Champ will dash forward to the player and grab the player’s body,
  // if The Champ grabs the player body it will then slam the player to the ground.
  // The slam will deal 10 damage to the player and give Nausea II effect for 5 seconds.
  // ○ On impact there will be an explosion of blocks particle around the player.
  // ○ Execute an action bar that says: “Beware of The Champ!”
  // ○ This skill will have a cooldown time of 16 seconds.
  // ● Player Throw
  // CHANGE: 玩家投掷（Player Throw） - 增加投掷伤害，玩家被投掷时会受到 8 点伤害
  SKILL3_DAMAGE = 10;
  // SKILL3_DAMAGE = 8;
  SKILL3_DURATION = parseInt(2.0 * 20);
  Skill3_KNOCK_POWER = [2.0, 0.2];
  skill3(abilityId) {
    this.entity.triggerEvent("event:set_use_skill3");
    this.setPlayerTip(20, "Beware of The Champ!");
    this.delayResetAbility(this.SKILL3_DURATION, 5);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let active = function* () {
      yield 5;
      this.impuseForward(this.entity, 2.5, 0.15);
      let vec = this.entity.getViewDirection();
      let players = [];
      for (let index = 0; index < 6; index++) {
        yield 1;
        let spawnPos = zdk.getPosForward(this.entity, 1);
        for (let victim of this.getRadiusEntity(spawnPos, 2)) {
          players.push(victim);
        }
        for (let player of players) {
          player.applyKnockback(vec.x, vec.z, 0.65, 0.0);
        }
      }
      yield 5;
      if (!this.entity || !this.entity.isValid()) return;
      this.entity.runCommand("/particle minecraft:huge_explosion_emitter ^^^2");
      for (let player of players) {
        player.addEffect("nausea", 5 * 20, { amplifier: 1 });
        player.applyDamage(this.SKILL3_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
        zdk.setPosKockback(player, knockPos, this.Skill3_KNOCK_POWER);
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // ○ The Champ will dash forward to the player and grab the player’s body,
  // if The Champ grabs the player body it will then throw the player with both of its hands.
  // The attack will throw players to the sky up to 12 blocks away and deal damage based on the fall damage.
  // ○ Execute an action bar that says: “Beware of The Champ!”
  // ○ This skill will have a cooldown time of 12 seconds.
  // ● Headbutt
  SKILL4_DURATION = parseInt(2.0 * 20);
  SKILL4_ATTACK_TIME = parseInt(1.25 * 20);
  skill4(abilityId) {
    this.entity.triggerEvent("event:set_use_skill4");
    this.setPlayerTip(20, "Beware of The Champ!");
    this.delayResetAbility(this.SKILL4_DURATION, 5);
    this.abilityCd.set(
      abilityId,
      Date.now() +
        50 * this.SKILL3_DURATION +
        ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
    );

    let active = function* () {
      yield 5;
      this.impuseForward(this.entity, 2.5, 0.15);
      let vec = this.entity.getViewDirection();
      let players = [];
      for (let index = 0; index < 6; index++) {
        yield 1;
        let spawnPos = zdk.getPosForward(this.entity, 1);
        for (let victim of this.getRadiusEntity(spawnPos, 2)) {
          players.push(victim);
        }
        for (let player of players) {
          player.applyKnockback(vec.x, vec.z, 0.65, 0.0);
        }
      }
      yield 5;
      if (!this.entity || !this.entity.isValid()) return;
      for (let player of players) {
        player.applyKnockback(0, 0, 0.1, 1.5);
      }
    }.bind(this);
    zdk.startCoroutine(active);
  }

  // ○ The Champ will take a running stance and then run straight forward to the player
  // with its head in front and ram the player,
  // the player will be able to dodge and the skill will be stopped if The Champ hit any blocks ahead
  // or didn’t hit anything after running for 9 blocks.
  // On impact the attack will deal 9 damage and knock the player back by 5 blocks away.
  // ○ Execute an action bar that says: “Beware of The Champ!”
  // ○ This skill will have a cooldown time of 8 seconds.
  // CHANGE: 头槌（Headbutt） - 撞击伤害提升至 15 点
  // SKILL5_DAMAGE = 9;
  SKILL5_DAMAGE = 15;
  SKILL5_KNOCK_FORWARD_POWER = 0.3;
  SKILL5_KNOCK_POWER = [2.0, 0.15];
  skill5(abilityId) {
    this.entity.triggerEvent("event:set_use_skill5");
    this.setPlayerTip(20, "Beware of The Champ!");

    let ticks = 2 * 20;
    let runId = mc.system.runInterval(() => {
      ticks--;
      if (ticks <= 0 || !this.entity || !this.entity.isValid()) {
        if (this.entity) {
          this.delayResetAbility(5);
          this.abilityCd.set(
            abilityId,
            Date.now() + ABILITY_COOLDOWN_CONFIG.get(abilityId)[0]
          );
        }
        this.clearRun(runId);
        return;
      }

      if (ticks % 10 == 0) {
        this.entity.runCommand(
          "/execute as @s facing entity @p eyes run tp @s ~ ~ ~ ~ ~"
        );
      }

      this.impuseForward(this.entity, this.SKILL5_KNOCK_FORWARD_POWER);

      let spawnPos = zdk.getPosForward(this.entity, 1);
      let knockPos = this.entity.location;
      for (let victim of this.getRadiusEntity(spawnPos, 2)) {
        victim.applyDamage(this.SKILL5_DAMAGE, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.entity,
        });
        zdk.setPosKockback(victim, knockPos, this.SKILL5_KNOCK_POWER);
      }
    }, 1);
  }
}
