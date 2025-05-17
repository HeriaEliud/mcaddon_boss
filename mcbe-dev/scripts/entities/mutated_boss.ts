import { world, system } from '@minecraft/server';

// 实体标识符
const MUTATED_BOSS_ID = "pixelmind:mutated_boss";

// 监听实体生成
world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;
  
  if (entity.typeId !== MUTATED_BOSS_ID) {
    return;
  }
  
  console.warn(`变异怪物已生成: ${entity.typeId} at ${entity.location.x}, ${entity.location.y}, ${entity.location.z}`);
  
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
    
    console.warn(`变异怪物攻击: ${attacker.typeId} 命中 ${target.typeId}`);
    
    // 击退逻辑
    const knockbackPower = 2;
    const knockbackDirection = {
      x: target.location.x - attacker.location.x,
      z: target.location.z - attacker.location.z
    };
    
    // 标准化方向向量
    const magnitude = Math.sqrt(knockbackDirection.x * knockbackDirection.x + knockbackDirection.z * knockbackDirection.z);
    if (magnitude > 0) {
      knockbackDirection.x = knockbackDirection.x / magnitude * knockbackPower;
      knockbackDirection.z = knockbackDirection.z / magnitude * knockbackPower;
    }
    
    // 应用击退
    target.applyImpulse({
      x: knockbackDirection.x,
      y: 0.5, // 轻微向上击飞
      z: knockbackDirection.z
    });
    
    // 额外伤害（如果需要）
    target.applyDamage(2);
    
    // 打印击退信息
    console.warn(`变异怪物击退目标: 力量=${knockbackPower}, 方向=(${knockbackDirection.x.toFixed(2)}, ${knockbackDirection.z.toFixed(2)})`);
  }
});

// 添加一个动画监听器（仅调试用）
system.runInterval(() => {
  const entities = world.getDimension("overworld").getEntities({type: MUTATED_BOSS_ID});
  entities.forEach(entity => {
    // 这里只是为了触发entity处理，不需要特别操作
    if (entity && entity.typeId === MUTATED_BOSS_ID) {
      const health = entity.getComponent("health");
      if (health) {
        // 监控实体状态
      }
    }
  });
}, 60); // 每3秒检查一次
