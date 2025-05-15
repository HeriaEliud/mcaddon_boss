import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";

export const BOSS_ENTITY_MAP = new Map();

export class BossEntityBase extends zdk.ComponentBase {
  entity;
  abilityCd;

  onDestory() {
    this.entity = null;
    BOSS_ENTITY_MAP.delete(this.entityId);
    for (let runId of this.RUN_MAP.keys()) {
      mc.system.clearRun(runId);
    }
  }

  delayExecute(tick, func) {
    zdk.delayExecute(tick, () => {
      if (!this.entity || !this.entity.isValid()) return;
      func();
    });
  }

  triggerEvent(event) {
    if (!this.entity || !this.entity.isValid()) return;
    this.entity.triggerEvent(event);
  }

  addRun(runId) {
    this.RUN_MAP.set(runId, true);
  }

  clearRun(runId) {
    mc.system.clearRun(runId);
    this.RUN_MAP.delete(runId);
  }

  setPlayerTip(radius, text) {
    let position = this.entity.location;
    for (let entity of this.getRadiusEntity(position, radius)) {
      entity.runCommand(`/title @s actionbar ${text}`);
    }
  }

  getRadiusEntity(position, radius, family = ["player"]) {
    return this.entity.dimension.getEntities({
      location: position,
      families: family,
      maxDistance: radius,
    });
  }

  getHealthRate() {
    let health = this.entity.getComponent(mc.EntityComponentTypes.Health);
    if (!health) return 0;
    return health.currentValue / health.effectiveMax;
  }

  delayResetAbility(tick, reset = 20) {
    this.delayExecute(tick, () => {
      if (!this.entity || !this.entity.isValid()) return;
      this.entity?.triggerEvent("event:reset_ability");
      this.delayExecute(reset, () => {
        if (!this.entity || !this.entity.isValid()) return;
        this.entity.triggerEvent("event:can_use_ability");
      });
    });
  }

  impuseForward(entity, power, height = 0) {
    let direction = entity.getViewDirection();
    entity.applyImpulse({
      x: direction.x * power,
      y: height,
      z: direction.z * power,
    });
  }

  impuseBackward(entity, power, height = 0) {
    let direction = entity.getViewDirection();
    entity.applyImpulse({
      x: -direction.x * power,
      y: height,
      z: -direction.z * power,
    });
  }

  constructor(entityId) {
    super(entityId);
    this.entity = mc.world.getEntity(entityId);
    this.abilityCd = new Map();
    BOSS_ENTITY_MAP.set(this.entityId, this);
    this.RUN_MAP = new Map();
  }

  tick() {}
}
