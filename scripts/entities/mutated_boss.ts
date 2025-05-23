import { world, system, Entity, GameMode, Player } from '@minecraft/server';
import { Vector3Utils } from '@minecraft/math';
import { getNearbyEntities, getViewCuboidEntities } from '../utils/vector_utils';
import { EntityDamageCause } from "@minecraft/server";

// 实体标识符
const MUTATED_BOSS_ID = "mutate:mutated_boss";

const IS_DYING_DP = "is_dying";

// 技能的冷却时间(ticks)
const BASIC_ATTACK_COOLDOWN = 100; // 5秒

// 技能冷却和状态
const CD_DP = "cd";
const DURING_SKILL_DP = "during_skill";

// 动画长度
const ANIMATION_LENGTHS = {
  attack: 1.0,
  basic_attack: 1.25,
  amorphosis: 1.625,
  zaisheng: 5.0,
  death: 2.7,
  physical_skills: 3.5,
};

// 监听实体生成
world.afterEvents.entitySpawn.subscribe(event => {
  const entity = event.entity;

  if (entity.typeId !== MUTATED_BOSS_ID) {
    return;
  }
  // 初始化实体的动态属性
  entity.setDynamicProperty(CD_DP, 0);
  entity.setDynamicProperty(DURING_SKILL_DP, false);

  // 实体生成时通知玩家
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物出现在: ${entity.location.x.toFixed(1)}, ${entity.location.y.toFixed(1)}, ${entity.location.z.toFixed(1)}`);
  });

  // 播放生成动画 (amorphosis)
  playSpawnAnimation(entity);
});

// 播放生成动画
function playSpawnAnimation(entity: Entity) {
  if (!entity.isValid()) return;

  // 设置状态标记
  entity.setDynamicProperty(DURING_SKILL_DP, true);

  // 首先禁用战斗行为
  entity.triggerEvent("event:disable_combat");

  // 延迟播放动画，确保实体已准备好
  system.runTimeout(() => {
    if (!entity.isValid()) return;

    // 添加减速效果防止移动
    try {
      entity.addEffect("slowness", ANIMATION_LENGTHS.amorphosis * 20, { amplifier: 255, showParticles: false });
    } catch (err) { }

    // 通知玩家
    world.getPlayers().forEach(player => {
      player.sendMessage(`变异怪物苏醒了`);
    });

    entity.playAnimation("animation.pixelmind.mutated_boss.amorphosis");

  }, 1); // 延迟

  // 动画结束后恢复状态
  system.runTimeout(() => {
    if (entity.isValid()) {
      entity.triggerEvent("event:enable_combat");
      entity.setDynamicProperty(DURING_SKILL_DP, false);
      entity.setDynamicProperty(CD_DP, system.currentTick + 20);
    }
  }, ANIMATION_LENGTHS.amorphosis * 20);
}

// 技能：普通攻击
function performAttack(entity: Entity) {
  if (!entity.isValid()) return;

  entity.setDynamicProperty(DURING_SKILL_DP, true);

  // 播放普通攻击动画
  entity.playAnimation("animation.pixelmind.mutated_boss.attack");
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物使用了attack!`);
  });

  // 添加减速效果
  try {
    entity.addEffect("slowness", ANIMATION_LENGTHS.attack * 20, { amplifier: 255, showParticles: false });
  } catch (err) { }

  // 攻击判定
  system.runTimeout(() => {
    if (!entity.isValid()) return;

    // 获取前方范围内的实体并造成伤害
    getNearbyEntities(entity, 4, Vector3Utils.scale(entity.getViewDirection(), 2)).forEach(target => {
      if (target.typeId !== MUTATED_BOSS_ID) {
        target.applyDamage(6, {
          cause: EntityDamageCause.entityAttack,
          damagingEntity: entity
        });
        try {
          // 普通攻击可以有击退效果
          target.applyKnockback(
            entity.getViewDirection().x,
            entity.getViewDirection().z,
            1.2, 0.3
          );
        } catch (err) { }
      }
    });
  }, 12); // 普通攻击判定点通常较早

  // 结束技能
  system.runTimeout(() => {
    if (entity.isValid()) {
      entity.setDynamicProperty(DURING_SKILL_DP, false);
    }
  }, ANIMATION_LENGTHS.attack * 20);
}

// 执行基础攻击
function performBasicAttack(entity: Entity) {
  if (!entity.isValid()) return;

  // 设置状态
  entity.setDynamicProperty(DURING_SKILL_DP, true);

  // 直接播放动画（不依赖变量触发状态机）
  entity.playAnimation("animation.pixelmind.mutated_boss.basic_attack");
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物使用了basic attack!`);
  });

  // 添加减速效果防止移动
  try {
    entity.addEffect("slowness", 200, { amplifier: 255, showParticles: false });
  } catch (err) {
    // 处理API不兼容
  }

  // 攻击判定时间点
  system.runTimeout(() => {
    if (!entity.isValid()) return;

    // 使用 getViewCuboidEntities 获取前方长方体区域内的实体
    const length = 5; // 前方5格深度
    const width = 3;  // 宽度2.5格
    const height = 3; // 高度2.5格

    // 造成伤害
    const targets = getViewCuboidEntities(entity, length, width, height);
    targets.forEach(target => {
      if (target.typeId !== MUTATED_BOSS_ID) {
        target.applyDamage(8, {
          cause: EntityDamageCause.entityAttack,
          damagingEntity: entity
        });
      }
    });
  }, 18); // 根据动画调整时间点

  // 技能结束后清理状态
  system.runTimeout(() => {
    if (entity.isValid()) {
      entity.setDynamicProperty(DURING_SKILL_DP, false);
      entity.setDynamicProperty(CD_DP, system.currentTick + 100); // 设置冷却
    }
  }, ANIMATION_LENGTHS.basic_attack * 20);
}

// 扩臂重击技能
function performHeavyBlow(entity: Entity) {
  if (!entity.isValid()) return;

  // 设置状态
  entity.setDynamicProperty(DURING_SKILL_DP, true);

  // 播放扩臂重击动画
  entity.playAnimation("animation.pixelmind.mutated_boss.physical_skills");
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物使用了heavy blow`);
  });

  // 添加减速效果防止移动
  try {
    entity.addEffect("slowness", ANIMATION_LENGTHS.physical_skills * 20, { amplifier: 255, showParticles: false });
  } catch (err) { }

  // 定义伤害判定时间点数组 - 从动画分析得到的关键帧时间点
  const damageTimePoints = [
    { tick: 12, damage: 2, knockback: false }, // 0.6秒，初次挥动
    { tick: 22, damage: 2, knockback: false }, // 1.1秒，第二次挥动
    { tick: 32, damage: 2, knockback: false }, // 1.6秒，第三次挥动 
    { tick: 47, damage: 4, knockback: false }, // 2.35秒，第四次挥动
    { tick: 60, damage: 8, knockback: true }   // 3.0秒，最后重击
  ];

  // 在每个时间点进行伤害判定
  damageTimePoints.forEach(point => {
    system.runTimeout(() => {
      if (!entity.isValid()) return;

      // 获取前方扇形区域内的实体
      getNearbyEntities(entity, 5).forEach(target => {
        if (target.typeId !== MUTATED_BOSS_ID) {
          // 检查目标是否在实体前方
          const dirToTarget = Vector3Utils.subtract(target.location, entity.location);
          const dotProduct = Vector3Utils.dot(
            Vector3Utils.normalize(entity.getViewDirection()),
            Vector3Utils.normalize(dirToTarget)
          );

          // 如果目标在实体前方120度扇形区域内
          if (dotProduct > 0.5) { // cos(60°) ≈ 0.5
            // 应用伤害
            target.applyDamage(point.damage, {
              cause: EntityDamageCause.entityAttack,
              damagingEntity: entity
            });

            // 只在最后一击时添加击退效果
            if (point.knockback) {
              try {
                // 强力击退
                target.applyKnockback(
                  entity.getViewDirection().x,
                  entity.getViewDirection().z,
                  3.0, // 击退力度
                  0.5  // 垂直击退
                );
              } catch (err) { }
            }
          }
        }
      });

    }, point.tick);
  });

  // 结束技能
  system.runTimeout(() => {
    if (entity.isValid()) {
      entity.setDynamicProperty(DURING_SKILL_DP, false);
      entity.setDynamicProperty(CD_DP, system.currentTick + 100); // 5秒冷却
    }
  }, ANIMATION_LENGTHS.physical_skills * 20);
}

// 再生技能
function performRegenerate(entity: Entity) {
  if (!entity.isValid()) return;

  // 设置状态
  entity.setDynamicProperty(DURING_SKILL_DP, true);

  // 获取最大生命值
  const maxHealth = entity.getComponent("health")?.defaultValue || 200;

  // 播放再生动画
  entity.playAnimation("animation.pixelmind.mutated_boss.zaisheng");
  world.getPlayers().forEach(player => {
    player.sendMessage(`变异怪物正在恢复生命力!`);
  });

  // 添加减速效果防止移动
  try {
    entity.addEffect("slowness", 120, { amplifier: 255, showParticles: false });
  } catch (err) { }

  // 添加抗性效果(减免伤害)
  try {
    entity.addEffect("resistance", 100, { amplifier: 4, showParticles: true }); // 5秒，抗性V (80%伤害减免)
  } catch (err) { }

  // 恢复生命值 
  system.runTimeout(() => {
    if (!entity.isValid()) return;

    // 获取回血前的生命值
    const beforeHealth = entity.getComponent("health")?.currentValue || 0;

    // 控制只恢复25点生命值
    const healTarget = Math.min(25, maxHealth - beforeHealth);

    if (healTarget <= 0) {
      console.warn(`[回血中断] 生命值已满，不需要恢复`);
      world.getPlayers().forEach(player => {
        player.sendMessage(`变异怪物生命值已满，无需恢复!`);
      });
      return;
    }

    // 计算再生效果参数
    const amplifier = 1; // 再生IV
    const duration = Math.ceil(healTarget * 3 / (amplifier + 1)); // 持续时间(秒)

    try {
      // 应用再生效果
      entity.addEffect("regeneration", duration * 20, { amplifier: amplifier, showParticles: true });
    } catch (err) {
      console.warn(`[回血错误] 应用效果失败: ${err}`);
    }
    
  }, 40); // 效果开始时间点

  // 结束技能
  system.runTimeout(() => {
    if (entity.isValid()) {
      entity.setDynamicProperty(DURING_SKILL_DP, false);
      entity.setDynamicProperty(CD_DP, system.currentTick + 150); // 冷却时间
    }
  }, 100); // 动画时长(约5秒)
}

// 定义技能数据
const skillData = [
  {
    name: "普通攻击",
    skill: performAttack,
    condition: (entity: Entity, player: Entity) => Vector3Utils.distance(entity.location, player.location) < 5, // 近距离时使用普通攻击
    cd: 30, // 普通攻击冷却短
    weight: 3 // 普通攻击权重高，更容易触发
  },
  {
    name: "基础技能攻击",
    skill: performBasicAttack,
    condition: (entity: Entity, player: Entity) => Vector3Utils.distance(entity.location, player.location) < 6,
    cd: 80, // 技能攻击冷却
    weight: 2 // 技能攻击权重
  },
  {
    name: "再生",
    skill: performRegenerate,
    condition: (entity: Entity, player: Entity) => {
      // 获取当前生命值和最大生命值
      const health = entity.getComponent("health");
      if (!health) return false;

      // 当生命值低于70%时才使用再生技能
      const healthPercentage = health.currentValue / health.defaultValue;
      return healthPercentage < 0.7;
    },
    cd: 150, // 冷却
    weight: 3  // 优先级
  },
  {
    name: "扩臂重击",
    skill: performHeavyBlow,
    condition: (entity: Entity, player: Entity) => {
      // 当玩家在范围内时使用此技能
      const distance = Vector3Utils.distance(entity.location, player.location);
      return distance >= 0 && distance <= 8;
    },
    cd: 100, // 5秒冷却
    weight: 3  // 测试用权重
  }
  // 未来可以添加更多技能
];


// 主循环
system.runInterval(() => {
  for (const entity of world.getDimension("overworld").getEntities({
    type: MUTATED_BOSS_ID
  })) {
    if (!entity.isValid()) continue;

    // 死亡判断 - 检测 is_sheared 组件
    if (entity.getComponent("minecraft:is_sheared")) {
      // 如果已经标记为正在死亡，跳过后续处理
      if (entity.getDynamicProperty(IS_DYING_DP)) {
        continue;
      }
      // 第一次检测到死亡标记时执行
      entity.setDynamicProperty(IS_DYING_DP, true);
      entity.setDynamicProperty(DURING_SKILL_DP, true);

      // 播放死亡动画
      entity.playAnimation("animation.pixelmind.mutated_boss.death");

      // 通知玩家
      world.getPlayers().forEach(player => {
        player.sendMessage(`变异怪物被击败了!`);
      });

      // 动画完成后强制移除实体
      system.runTimeout(() => {
        if (entity.isValid()) {
          entity.remove();
        }
      }, ANIMATION_LENGTHS.death * 20);

      // 跳过其他处理
      continue;
    }

    // 如果正在执行技能，跳过
    if (entity.getDynamicProperty(DURING_SKILL_DP)) continue;

    // 获取附近玩家
    const players = getNearbyEntities(entity, 32).filter(e => e.typeId === "minecraft:player");
    if (players.length === 0) continue;

    // 获取最近的玩家
    const player = players.sort((a, b) =>
      Vector3Utils.distance(a.location, entity.location) -
      Vector3Utils.distance(b.location, entity.location)
    )[0];

    // 创造模式跳过
    try {
      // 先确认是玩家实体，然后转换类型
      if (player.typeId === "minecraft:player") {
        const playerEntity = player as Player;
        if (playerEntity.getGameMode() === GameMode.creative) continue;
      }
    } catch (err) { }

    // 朝向玩家
    const direction = Vector3Utils.subtract(player.location, entity.location);
    entity.setRotation({ x: entity.getRotation().x, y: Math.atan2(direction.z, direction.x) * (180 / Math.PI) - 90 });


    // 技能判断
    if (system.currentTick > Number(entity.getDynamicProperty(CD_DP) || 0)) {
      // 过滤可用技能
      const availableSkills = skillData.filter(data => data.condition(entity, player));

      if (availableSkills.length > 0) {
        // 根据权重随机选择技能
        const totalWeight = availableSkills.reduce((sum, data) => sum + data.weight, 0);
        let randomValue = Math.random() * totalWeight;

        let selectedSkill = availableSkills[availableSkills.length - 1];
        for (const data of availableSkills) {
          randomValue -= data.weight;
          if (randomValue <= 0) {
            selectedSkill = data;
            break;
          }
        }

        // 执行技能
        selectedSkill.skill(entity);

        // 设置CD
        entity.setDynamicProperty(CD_DP, system.currentTick + selectedSkill.cd);
      }
    }
  }
}, 10);
