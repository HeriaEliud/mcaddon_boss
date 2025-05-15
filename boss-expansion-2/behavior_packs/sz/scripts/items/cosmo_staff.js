import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { PLAYER_ABILITY_CD } from "./mgr";

// ● Crystal Strike -
// When a player attacks, the staff will shoot 2 small and sharp red crystal projectiles to the front to attack.
// On impact the crystal will break with explosive power of 2 and deal 7 damage to any entities affected by the explosion.

// ● Cosmo Ray -
// Player will hold down the staff for 5 seconds preparing the energy before attacking and releasing the energy.
// After 5 seconds a ray attack similar to the Cosmo the Oculus’s Cosmo ray will be shot from the staff.
// The attack will be way smaller with the ray size of 2 by 2 blocks and a range up to 8 blocks ahead.
// The ray will shoot for 5 seconds and deal 6 damage per seconds to any entities affected by the ray.

const CLICK_PJD_ID = "sz_workshop:pjd_cosmo_the_oculus_atk2";
const CLICK_ATTACK_TIME = parseInt(0.35 * 20);
const CLICK_IMPULSE = 1.25;
const CLICK_DURATION = parseInt(0.875 * 20);

const HOLD_DET_ID = "sz_workshop:cosmo_staff_atk2";
const HOLD_ATTACK_TIME = parseInt(5.42 * 20);
const HOLD_DURATION = parseInt(5.875 * 20);
const HOLD_DAMAGE = 6;
const HOLD_MAX_RANGE = 16;

export class CosmoStaffAbility {
  static click(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.cosmo_staff.attack1",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    PLAYER_ABILITY_CD.set(entityId, Date.now() + CLICK_DURATION * 50);

    for (let i = 0; i < 2; i++) {
      mc.system.runTimeout(() => {
        if (!entity) return;
        entity.dimension.playSound(
          "sz_workshop.player_arcane_staff_attack1",
          entity.location
        );
        let view_vector = entity.getViewDirection();
        let location = zdk.getPosForward(entity, 1.5);
        location.y += 1.5;
        let projectile = entity.dimension.spawnEntity(CLICK_PJD_ID, location);
        projectile.triggerEvent("event:player_ability");
        let pjd_comp = projectile.getComponent(
          mc.EntityComponentTypes.Projectile
        );
        pjd_comp?.shoot(zdk.vec_scale(view_vector, CLICK_IMPULSE));
      }, CLICK_ATTACK_TIME + i * 5);
    }
  }

  static hold(entityId) {
    let entity = mc.world.getEntity(entityId);
    if (!entity) return;
    entity.playAnimation(
      "animation.boss_expansion.player.cosmo_staff.attack2",
      {
        blendOutTime: 0.15,
        nextState: "0",
        stopExpression: "v.is_first_person || q.any_animation_finished",
      }
    );
    PLAYER_ABILITY_CD.set(entityId, Date.now() + HOLD_DURATION * 50);

    entity.dimension.playSound(
      "sz_workshop.player_cosmo_staff_attack2",
      entity.location
    );
    mc.system.runTimeout(() => {
      this.hold_trigger(entity);
    }, HOLD_ATTACK_TIME);
  }

  static hold_trigger(entity) {
    if (!entity) return;

    let dimension = entity.dimension;
    let location = entity.location;
    location.y += 1.0;

    entity.runCommand(
      `/execute rotated as @s anchored eyes run summon ${HOLD_DET_ID} ~~~~~`
    );
    let direction = entity.getViewDirection();

    const hits = dimension.getEntitiesFromRay(location, direction, {
      includeLiquidBlocks: true,
      includePassableBlocks: true,
      ignoreBlockCollision: false,
      maxDistance: HOLD_MAX_RANGE,
    });

    for (let { entity: hit, distance: dist } of hits) {
      if (hit.id === entity.id) continue;
      hit.applyDamage(HOLD_DAMAGE);
    }
  }
}
