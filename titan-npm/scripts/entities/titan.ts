// scripts/entities/titan.ts
import { world, system, EntityTypes } from '@minecraft/server';
import { addNamespace } from '../utils/string_utils';
import { createImpactDust } from '../fx/particle_fx';

// 实体标识符
const TITAN_ID = addNamespace('earth_titan');

world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;
  
  if (entity.typeId !== TITAN_ID) {
    return;
  }
  //world.getDimension("overworld").runCommand(`say Titan entity spawned at: ${entity.location.x}, ${entity.location.y}, ${entity.location.z}`);
  //console.log(`Titan entity spawned at: ${entity.location.x}, ${entity.location.y}, ${entity.location.z}`);
  world.getPlayers().forEach(player => {
    player.sendMessage(`Titan entity spawned at: ${entity.location.x}, ${entity.location.y}, ${entity.location.z}`);
  });
});

// 使用实体命中事件
world.afterEvents.entityHitEntity.subscribe(event => {
  // 检查是否是 Titan 攻击其他实体
  if (event.damagingEntity && event.damagingEntity.typeId === TITAN_ID && 
      event.hitEntity.typeId !== TITAN_ID) {
    const attacker = event.damagingEntity;
    const target = event.hitEntity;
    console.log(`Titan hit entity: ${target.typeId}`);
    
    // 计算命中位置
    const hitLocation = {
      // 在两个实体之间计算接触点，略微偏向目标
      x: target.location.x + (attacker.location.x - target.location.x) * 0.3,
      y: target.location.y + (target.getHeadLocation().y - target.location.y) * 1.6, // 大约在胸部位置
      z: target.location.z + (attacker.location.z - target.location.z) * 0.3
    };
    
    // 生成撞击尘埃效果   
    createImpactDust(target.dimension, hitLocation);
  }
});

console.log("Titan entity script loaded");