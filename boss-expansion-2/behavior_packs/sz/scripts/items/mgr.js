import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { ArcaneStaffAbility } from "./arcane_staff";
import { CosmoStaffAbility } from "./cosmo_staff";
import { KrakenSwordAbility } from "./kraken_sword";
import { KnarfyClawAbility } from "./knarfy_claw";

const ABILITY_ITEM_DATA = [
  "sz_workshop:arcane_staff",
  "sz_workshop:cosmo_staff",
  "sz_workshop:knarfy_claw",
  "sz_workshop:kraken_sword",
];

export const SPAWN_BUILD_ITEM = [
  "sz_workshop:tomb_seal", // 64 50 49
  "sz_workshop:temple_seal", // 57 54 49
  "sz_workshop:cave_seal", // 51 49 51
];

const BUILD_SIZE_CONFIG = new Map([
  ["sz_workshop:tomb_seal", { x: 64, y: 50, z: 49 }],
  ["sz_workshop:temple_seal", { x: 57, y: 54, z: 49 }],
  ["sz_workshop:cave_seal", { x: 51, y: 49, z: 51 }],
]);

const SPAWN_BUILD_VARIANT_ORDER = [
  "boss_expansion:the_pharoah",
  "boss_expansion:arcane_axolotl",
  "boss_expansion:knarfy_boss",
];

export const PLAYER_ABILITY_CD = new Map();

export class SpawnEntityItem {
  static init() {
    // mc.world.afterEvents.projectileHitBlock.subscribe((eventData) => {
    //   let projectile = eventData.projectile;
    //   if (projectile.typeId === "sz_workshop:icon_projectile") {
    //     let dimension = eventData.dimension;
    //     let hitPos = eventData.location;
    //     let variantComp = projectile.getComponent(
    //       mc.EntityComponentTypes.Variant
    //     );
    //     let variant = variantComp?.value;
    //     let buildId = SPAWN_BUILD_VARIANT_ORDER[variant];
    //     mc.world.structureManager.place(buildId, dimension, hitPos);
    //     projectile.runCommand("/kill @s");
    //   }
    // });
    mc.world.afterEvents.itemUse.subscribe((eventData) => {
      let entity = eventData.source;
      let item = eventData.itemStack;
      if (SPAWN_BUILD_ITEM.includes(item.typeId)) {
        let buildId =
          SPAWN_BUILD_VARIANT_ORDER[SPAWN_BUILD_ITEM.indexOf(item.typeId)];
        let buildSize = BUILD_SIZE_CONFIG.get(item.typeId);
        let location = entity.location;
        let rotation = entity.getRotation();

        let yaw = rotation.y + 135;
        let pos_modify = { x: 0, y: 0, z: 0 };
        // mc.world.sendMessage(`rotation: ${yaw}`);
        if (yaw <= 90) {
          pos_modify.z -= buildSize.z / 2;
          pos_modify.x += 5;
        } else if (yaw <= 180) {
          pos_modify.x -= buildSize.x / 2;
          pos_modify.z += 5;
        } else if (yaw <= 270) {
          pos_modify.z -= buildSize.z / 2;
          pos_modify.x -= buildSize.x + 5;
        } else {
          pos_modify.x -= buildSize.x / 2;
          pos_modify.z -= buildSize.z + 5;
        }

        let spawnPos = zdk.vec_add(location, pos_modify);
        mc.world.structureManager.place(buildId, entity.dimension, spawnPos);

        // let view_vector = entity.getViewDirection();
        // let projectile = entity.dimension.spawnEntity(
        //   "sz_workshop:icon_projectile",
        //   {
        //     x: location.x + view_vector.x * 1.0,
        //     y: location.y + 1.5,
        //     z: location.z + view_vector.z * 1.0,
        //   }
        // );
        // projectile.triggerEvent(item.typeId);
        // let pjd_comp = projectile.getComponent(
        //   mc.EntityComponentTypes.Projectile
        // );
        // pjd_comp?.shoot({
        //   x: view_vector.x * 3.5,
        //   y: view_vector.y * 3.5,
        //   z: view_vector.z * 3.5,
        // });

        entity.runCommand(`/clear @s ${item.typeId} 0 1`);
      }
    });

    mc.world.afterEvents.itemStopUse.subscribe((eventData) => {
      let entity = eventData.source;
      let item = eventData.itemStack;
      let duration = eventData.useDuration;

      if (item && ABILITY_ITEM_DATA.includes(item.typeId)) {
        let preTime = Date.now();
        if (PLAYER_ABILITY_CD.has(entity.id)) {
          if (preTime < PLAYER_ABILITY_CD.get(entity.id)) {
            return;
          }
        }
        // mc.world.sendMessage(`使用时长：${duration}`);
        PLAYER_ABILITY_CD.set(entity.id, preTime);
        if (duration > 10000) {
          if (item.typeId === "sz_workshop:arcane_staff")
            ArcaneStaffAbility.click(entity.id);
          else if (item.typeId === "sz_workshop:cosmo_staff")
            CosmoStaffAbility.click(entity.id);
          else if (item.typeId === "sz_workshop:knarfy_claw")
            KnarfyClawAbility.click(entity.id);
          else if (item.typeId === "sz_workshop:kraken_sword")
            KrakenSwordAbility.click(entity.id);
        } else {
          if (item.typeId === "sz_workshop:arcane_staff")
            ArcaneStaffAbility.hold(entity.id);
          else if (item.typeId === "sz_workshop:cosmo_staff")
            CosmoStaffAbility.hold(entity.id);
          else if (item.typeId === "sz_workshop:knarfy_claw")
            KnarfyClawAbility.hold(entity.id);
          else if (item.typeId === "sz_workshop:kraken_sword")
            KrakenSwordAbility.hold(entity.id);
        }
      }
    });
  }
}
