import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { PLAYER_ABILITY_CD } from "./mgr";

// ● Ink Strike -
// Normal attack combo with up to 3 moves that on impact each of the combo will deal 9 damage
// and give Blindness I and Weakness II to the enemies.

// ● Coral Strike - Player will first hold for 3 seconds to charge the attack
// and after 3 seconds up to 5 colorful sharp coral projectiles will be shot forward towards the enemies.
// On impact each of the projectiles will deal 4 damage to the enemies and release a splash of coral particles.

const CLICK_ATTACK_TIME = [
  parseInt(0.38 * 20),
  parseInt(1.0 * 20),
  parseInt(1.58 * 20),
];
const CLICK_DURATION = parseInt(2.375 * 20);

const HOLD_PJD_ID = "sz_workshop:pjd_emit_the_kraken_sk5";
const HOLD_ATTACK_TIME = parseInt(1.9 * 20);
const HOLD_IMPULSE = 1.25;
const HOLD_DURATION = parseInt(5.875 * 20);

export class KrakenSwordAbility {
  static click(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.kraken_sword.attack1",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间
    PLAYER_ABILITY_CD.set(entityId, Date.now() + CLICK_DURATION * 50 + 5000);

    entity.dimension.playSound(
      "sz_workshop.player_kraken_sword_attack1",
      entity.location
    );
    let ticks = 0;
    let comboTime = 0;
    let runId = mc.system.runInterval(() => {
      for (let tick of CLICK_ATTACK_TIME) {
        if (tick == ticks) {
          let location = zdk.getPosForward(entity, 1.5);
          for (let victim of entity.dimension.getEntities({
            excludeFamilies: ["player"],
            maxDistance: 3,
            location: location,
          })) {
            victim.addEffect("blindness", 20 * 2, {
              amplifier: 0,
            });
            victim.addEffect("weakness", 20 * 2, {
              amplifier: 1,
            });
            // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间
            // victim.applyDamage(9);
            victim.applyDamage(8);
          }
          comboTime++;
          if (comboTime >= 3) {
            mc.system.clearRun(runId);
            break;
          }
        }
      }
      ticks++;
    }, 1);
  }

  static hold(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.kraken_sword.attack2",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间
    // PLAYER_ABILITY_CD.set(entityId, Date.now() + HOLD_DURATION * 50);
    PLAYER_ABILITY_CD.set(entityId, Date.now() + HOLD_DURATION * 50 + 5000);

    entity.dimension.playSound(
      "sz_workshop.player_kraken_sword_attack2",
      entity.location
    );

    mc.system.runTimeout(() => {
      if (!entity) return;
      let location = zdk.getPosForward(entity, 1.5);
      entity.dimension.spawnParticle(
        "sz_workshop:kraken_sword_attack2_01",
        location
      );
      entity.dimension.spawnParticle(
        "sz_workshop:kraken_sword_attack2_02",
        location
      );
      entity.dimension.spawnParticle(
        "sz_workshop:kraken_sword_attack2_03",
        location
      );
      entity.dimension.spawnParticle(
        "sz_workshop:kraken_sword_attack2_04",
        location
      );
    }, HOLD_ATTACK_TIME);

    // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间
    // for (let i = 0; i < 5; i++) {
    for (let i = 0; i < 6; i++) {
      mc.system.runTimeout(() => {
        if (!entity) return;
        let view_vector = entity.getViewDirection();
        let location = zdk.getPosForward(entity, 1.5);
        location.y += 1.5;
        let projectile = entity.dimension.spawnEntity(HOLD_PJD_ID, location);
        projectile.triggerEvent("event:player_ability");
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot(zdk.vec_scale(view_vector, HOLD_IMPULSE));
      }, HOLD_ATTACK_TIME + i * 11);
    }
  }
}
