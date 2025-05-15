import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { KnarfyBossEntity } from "./knarfy_boss";
import { CosmoTheOculusEntity } from "./cosmo_the_oculus";
import { ArcaneAxolotlEntity } from "./arcane_axolotl";
import { ThePharoahEntity } from "./the_pharoah";
import { EmitTheKrakenEntity } from "./emit_the_kraken";
import { TheChampEntity } from "./the_champ";
import { ModPlayerMgr } from "./player";

import "./friendly_arcane_axolotl";

const ENTITY_TICK_INTERVAL = 5;
const ENTITY_INSTANCE = new Map();
const MOD_ENTITY_MAP = new Map([
  ["sz_workshop:knarfy_boss", KnarfyBossEntity],
  ["sz_workshop:arcane_axolotl", ArcaneAxolotlEntity],
  ["sz_workshop:cosmo_the_oculus", CosmoTheOculusEntity],
  ["sz_workshop:the_pharoah", ThePharoahEntity],
  ["sz_workshop:emit_the_kraken", EmitTheKrakenEntity],
  ["sz_workshop:the_champ", TheChampEntity],
]);
export function initEntity() {
  mc.world.afterEvents.entitySpawn.subscribe((args) => {
    let entity = args.entity;
    let entityId = entity.id;
    let typeId = entity.typeId;
    if (MOD_ENTITY_MAP.has(typeId)) {
      let entityCls = MOD_ENTITY_MAP.get(typeId);
      let modEntity = new entityCls(entityId);
      modEntity.setAwake();
      ENTITY_INSTANCE.set(entityId, modEntity);
    } else if (typeId === "sz_workshop:friendly_arcane_axolotl") {
      // console.warn(`friendly_arcane_axolotl spawned`)
      let tameComp = entity.getComponent(mc.EntityComponentTypes.Tameable);
      // console.warn(`tameable entity ${entity.id} -> ${tameComp?.isTamed} comp: ${tameComp}`);
      if (tameComp && !tameComp?.isTamed) {
        // console.warn(`taming entity ${entity.id}`);
        for (let player of entity.dimension.getEntities({
          families: ["player"],
          location: entity.location,
          maxDistance: 16,
        })) {
          // mc.world.sendMessage(`taming entity ${entity.id} -> ${player.id}`);
          tameComp.tame(player);
          entity.triggerEvent("event:on_tame");
        }
      }
    }
  });
  mc.world.afterEvents.entityHurt.subscribe((args) => {
    let entity = args.hurtEntity;
    let health = entity.getComponent(mc.EntityComponentTypes.Health);
    if (!health || (health && health.currentValue == 0)) {
      if (ENTITY_INSTANCE.has(entity.id)) {
        // mc.world.sendMessage(`removing entity ${entity.id}`);
        let modEntity = ENTITY_INSTANCE.get(entity.id);
        modEntity.setDestroy();
        ENTITY_INSTANCE.delete(entity.id);
      }
    }
  });

  mc.world.afterEvents.entityLoad.subscribe((args) => {
    let entity = args.entity;
    let entityId = args.entity.id;
    let typeId = args.entity.typeId;
    if (MOD_ENTITY_MAP.has(typeId)) {
      let entityCls = MOD_ENTITY_MAP.get(typeId);
      let modEntity = new entityCls(entityId);
      modEntity.setAwake();
      ENTITY_INSTANCE.set(entityId, modEntity);
    }
  });

  mc.system.runInterval(() => {
    for (let modEntity of ENTITY_INSTANCE.values()) {
      modEntity.tick();
    }
  }, ENTITY_TICK_INTERVAL);
}

const PLAYER_TICK_INTERVAL = 5;
const PLAYER_INSTANCE = new Map();
export function initPlayer() {
  mc.world.afterEvents.playerLeave.subscribe((args) => {
    // mc.world.sendMessage(`"player leaving: ${args.playerId}`);
    let modPlayer = PLAYER_INSTANCE.get(args.playerId);
    modPlayer.setDestory();
    PLAYER_INSTANCE.delete(args.playerId);
  });

  mc.system.runInterval(() => {
    mc.world.getAllPlayers().forEach((player) => {
      let playerId = player.id;
      if (!PLAYER_INSTANCE.has(playerId)) {
        PLAYER_INSTANCE.set(playerId, new ModPlayerMgr(playerId));
      }
      let playerMgr = PLAYER_INSTANCE.get(playerId);
      playerMgr.tick();
    });
  }, PLAYER_TICK_INTERVAL);
}
