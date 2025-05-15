import * as mc from "@minecraft/server";

/**
 * @param {string} entityId
 */
export function getEntityTypeId(entityId) {
  return mc.world.getEntity(entityId).typeId;
}

/**
 * @param {mc.Dimension} dim
 */
export function spawnEntity(engine_type_str, pos, dim) {
  return dim.spawnEntity(engine_type_str, pos);
}

export function spawnProjectile(engine_type_str, pos, dim, motion) {
  let projectile = spawnEntity(engine_type_str, pos, dim);
  projectile.clearVelocity();
  projectile.applyImpulse(motion);
  return projectile;
}

/**
 * @param {mc.Entity} entity
 */
export function setMotion(entity, motion) {
  entity.applyImpulse(motion);
}

/**
 * @param {mc.Entity} entity
 */
export function knockForward(entity, power) {
  let direction = entity.getViewDirection();
  entity.applyKnockback(direction.x, direction.z, power[0], power[1]);
}

/**
 * @param {mc.Entity} entity
 */
export function knockBackward(entity, power) {
  let direction = entity.getViewDirection();
  entity.applyKnockback(-direction.x, -direction.z, power[0], power[1]);
}

/**
 * @param {mc.Entity} entity
 */
export function setPosKockback(entity, postion, power) {
  entity.applyKnockback(
    entity.location.x - postion.x,
    entity.location.z - postion.z,
    power[0],
    power[1]
  );
}
