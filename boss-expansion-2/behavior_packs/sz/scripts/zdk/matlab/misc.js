import * as mc from "@minecraft/server";
import { vec_add, vec_len, vec_normalize, vec_scale, vec_sub } from "./vec";

/**
 * @param {mc.Entity} entity
 */
export function getPosForward(entity, forward = 1) {
  let location = entity.location;
  let direction = entity.getViewDirection();
  return vec_add(location, vec_scale(direction, forward));
}

export function delayExecute(tick, func) {
  mc.system.runTimeout(func, tick);
}

export function getPosFacingPosVec(src, des) {
  let view_vector = vec_normalize(vec_sub(des, src));
  let distance = vec_len(vec_sub(des, src));
  return vec_normalize(vec_scale(view_vector, distance));
}
