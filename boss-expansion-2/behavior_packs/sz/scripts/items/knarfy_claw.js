import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { PLAYER_ABILITY_CD } from "./mgr";

// ● Knarfy Claw -
// Normal attack combo with up to 3 moves that each of the attacks will deal 9 damage to the enemies
// and give them Slow II effect for 4 seconds.

// ● Blizzard Claw - Player will first hold the attack for 3 seconds before performing the attack.
// When performing the player will swing the claw really hard towards the enemies
// and on contact the claw will freeze the area within 4 blocks radius around the player.
// The attack will deal 10 damage to all entities within the freeze area and make them frozen unable to move for 6 seconds.

const CLICK_ATTACK_TIME = [
  parseInt(0.3 * 20),
  parseInt(0.8 * 20),
  parseInt(1.4 * 20),
];
const CLICK_DURATION = parseInt(1.75 * 20);

const HOLD_ATTACK_TIME = parseInt(1.0 * 20);
const HOLD_DURATION = parseInt(1.5 * 20);

export class KnarfyClawAbility {
  static click(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.knarfy_claw.attack1",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    PLAYER_ABILITY_CD.set(entityId, Date.now() + CLICK_DURATION * 50);

    entity.dimension.playSound(
      "sz_workshop.player_knarfy_claw_attack1",
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
            victim.addEffect("slowness", 20 * 4, {
              amplifier: 1,
            });
            // CHANGE: 基础攻击 - 伤害提升至 10 点
            // victim.applyDamage(9);
            victim.applyDamage(10);
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
      "animation.boss_expansion.player.knarfy_claw.attack2",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间 
    PLAYER_ABILITY_CD.set(entityId, Date.now() + HOLD_DURATION * 50 + 5000);

    entity.dimension.playSound(
      "sz_workshop.player_knarfy_claw_attack2",
      entity.location
    );
    mc.system.runTimeout(() => {
      if (!entity) return;
      for (let victim of entity.dimension.getEntities({
        excludeFamilies: ["player"],
        maxDistance: 4,
        location: entity.location,
      })) {
        victim.addEffect("slowness", 20 * 6, {
          amplifier: 255,
        });
        let location = victim.location;
        victim.dimension.spawnParticle(
          "sz_workshop:knarfy_claw_attack2_hit_01",
          location
        );
        victim.dimension.spawnParticle(
          "sz_workshop:knarfy_claw_attack2_hit_02",
          location
        );
        victim.dimension.spawnParticle(
          "sz_workshop:knarfy_claw_attack2_hit_03",
          location
        );
        victim.dimension.spawnParticle(
          "sz_workshop:knarfy_claw_attack2_hit_04",
          location
        );
        // CHANGE: 总伤害提升 - 右键攻击的总伤害提升至 24 点，并增加 5 秒冷却时间
        // victim.applyDamage(10);
        victim.applyDamage(8);
      }
    }, HOLD_ATTACK_TIME);
  }
}
