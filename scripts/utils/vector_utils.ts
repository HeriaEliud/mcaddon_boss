import { Entity, Vector3 } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";

/**
 * 获取实体前方扇形区域内的其他实体
 * @param entity 中心实体
 * @param radius 搜索半径
 * @param offset 前方偏移向量
 * @returns 实体数组
 */
export function getNearbyEntities(entity: Entity, radius: number, offset?: Vector3): Entity[] {
  const searchLocation = offset ? 
    Vector3Utils.add(entity.location, offset) : 
    entity.location;

  return entity.dimension.getEntities({
    location: searchLocation,
    maxDistance: radius
  }).filter(e => e.id !== entity.id);
}

/**
 * 获取实体视线方向的长方体区域内的实体
 * @param entity 实体
 * @param length 长方体长度
 * @param width 长方体宽度
 * @param height 长方体高度
 * @returns 实体数组
 */
/**
 * 获取实体视线方向的长方体区域内的实体
 * @param entity 实体
 * @param length 长方体长度(前方距离)
 * @param width 长方体宽度(水平宽度)
 * @param height 长方体高度(垂直高度)
 * @returns 实体数组
 */
/**
 * 获取实体视线方向的长方体区域内的实体
 * @param entity 实体
 * @param length 长方体长度(前方距离)
 * @param width 长方体宽度(水平宽度)
 * @param height 长方体高度(垂直高度)
 * @returns 实体数组
 */
export function getViewCuboidEntities(entity: Entity, length: number, width: number, height: number): Entity[] {
  // 实体位置和方向
  const entityPos = entity.location;
  const viewDir = entity.getViewDirection();
  
  // 为调试可以将边界显示出来
  // showCuboidBoundary(entity, length, width, height);
  
  // 计算搜索区域的中心点（偏移到前方）
  const centerPoint = {
    x: entityPos.x + (viewDir.x * length / 2),
    y: entityPos.y + 1, // 假设攻击中心在实体头部位置
    z: entityPos.z + (viewDir.z * length / 2)
  };
  
  // 计算搜索区域最大距离（以确保覆盖整个区域）
  const maxDistance = Math.sqrt(Math.pow(length, 2) + Math.pow(width, 2) + Math.pow(height, 2)) / 2 + 1;
  
  // 获取附近实体
  const nearbyEntities = entity.dimension.getEntities({
    location: centerPoint,
    maxDistance: maxDistance
  }).filter(e => e.id !== entity.id);
  
  // 计算实体朝向的角度
  const yaw = Math.atan2(viewDir.z, viewDir.x);
  
  // 结果数组
  const result = [];
  
  // 遍历每个潜在目标实体
  for (const target of nearbyEntities) {
    // 计算目标实体相对于攻击者的位置向量
    const relPos = {
      x: target.location.x - entityPos.x,
      y: target.location.y - entityPos.y,
      z: target.location.z - entityPos.z
    };
    
    // 将相对位置旋转到实体朝向的坐标系
    const cosYaw = Math.cos(-yaw);
    const sinYaw = Math.sin(-yaw);
    
    const rotX = relPos.x * cosYaw - relPos.z * sinYaw;
    const rotZ = relPos.x * sinYaw + relPos.z * cosYaw;
    
    // 判断是否在长方体区域内
    if (rotX > 0 && rotX < length && // 前方指定长度内
        Math.abs(rotZ) < width / 2 && // 左右不超过指定宽度
        Math.abs(relPos.y) < height / 2) { // 上下不超过指定高度
      result.push(target);
      
      // 调试信息
      /*
      world.getDimension('overworld').spawnParticle(
        'minecraft:basic_flame_particle', 
        target.location, 
        { molang: "0"}
      );
      */
    }
  }
  
  return result;
}



/**
 * 计算偏航角
 * @param x X坐标差值
 * @param z Z坐标差值
 * @returns 偏航角（度）
 */
export function getYaw(x: number, z: number): number {
  return Math.atan2(z, x) * (180 / Math.PI) - 90;
}