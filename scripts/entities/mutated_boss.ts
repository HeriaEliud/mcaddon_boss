import { world, system } from '@minecraft/server';

// 实体标识符
const MUTATED_BOSS_ID = "mutate:mutated_boss";

// 监听实体生成
world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;
  
  if (entity.typeId !== MUTATED_BOSS_ID) {
    return;
  }
  
  // 实体生成时通知玩家
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物出现在: ${entity.location.x.toFixed(1)}, ${entity.location.y.toFixed(1)}, ${entity.location.z.toFixed(1)}`);
  });
});

// 使用实体命中事件
world.afterEvents.entityHitEntity.subscribe(event => {
  // 检查是否是 Mutated Boss 攻击其他实体
  if (event.damagingEntity && event.damagingEntity.typeId === MUTATED_BOSS_ID && 
      event.hitEntity.typeId !== MUTATED_BOSS_ID) {
    const attacker = event.damagingEntity;
    const target = event.hitEntity;

    world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物攻击: ${attacker.typeId} 命中 ${target.typeId}`);
  });
  }
});


