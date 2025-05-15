import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { PLAYER_ABILITY_CD } from "./mgr";

const CLICK_PJD_ID = "sz_workshop:pjd_arcane_axolotl_atk2";
const CLICK_ATTACK_TIME = parseInt(0.35 * 20);
const CLICK_IMPULSE = 1.25;
const CLICK_DURATION = parseInt(0.875 * 20);

const HOLD_PJD_ID = "sz_workshop:pjd_arcane_axolotl_sk1";
const HOLD_ATTACK_TIME = parseInt(0.35 * 20);
const HOLD_IMPULSE = 1.25;
const HOLD_DURATION = parseInt(4.167 * 20);

export class ArcaneStaffAbility {
  static click(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.arcane_staff.attack1",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    entity.dimension.playSound(
      "sz_workshop.player_arcane_staff_attack1",
      entity.location
    );
    PLAYER_ABILITY_CD.set(entityId, Date.now() + CLICK_DURATION * 50);

    mc.system.runTimeout(() => {
      if (!entity) return;
      let view_vector = entity.getViewDirection();
      let location = zdk.getPosForward(entity, 1.5);
      location.y += 1.5;
      let projectile = entity.dimension.spawnEntity(CLICK_PJD_ID, location);
      projectile.triggerEvent("event:player_ability");
      let pjd_comp = projectile.getComponent(
        mc.EntityComponentTypes.Projectile
      );
      pjd_comp?.shoot(zdk.vec_scale(view_vector, CLICK_IMPULSE));
    }, CLICK_ATTACK_TIME);
  }

  static hold(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.arcane_staff.attack2",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    PLAYER_ABILITY_CD.set(entityId, Date.now() + HOLD_DURATION * 50);

    for (let i = 0; i < 4; i++) {
      mc.system.runTimeout(() => {
        if (!entity) return;
        entity.dimension.playSound(
          "sz_workshop.player_arcane_staff_attack2",
          entity.location
        );
        let view_vector = entity.getViewDirection();
        let location = zdk.getPosForward(entity, 1.5);
        location.y += 1.5;
        let projectile = entity.dimension.spawnEntity(HOLD_PJD_ID, location);
        projectile.triggerEvent("event:player_ability");
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot(zdk.vec_scale(view_vector, HOLD_IMPULSE));
      }, HOLD_ATTACK_TIME + i * 15);
    }
  }
}
