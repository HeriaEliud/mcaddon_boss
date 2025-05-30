import { world, system, Entity, GameMode, Player, Vector3 } from '@minecraft/server';
import { Vector3Utils } from '@minecraft/math';
import { getNearbyEntities, getViewCuboidEntities } from '../utils/vector_utils';
import { EntityDamageCause } from "@minecraft/server";

// 实体标识符
const MUTATED_BOSS_ID = "mutate:mutated_boss";

const IS_DYING_DP = "is_dying";

// 技能的冷却时间(ticks)
const s = 20; // 1秒

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
    const amplifier = 3; // 再生
    const duration = Math.ceil(healTarget * 3 / (amplifier + 1)); // 持续时间(秒)

    try {
      // 应用再生效果
      entity.addEffect("regeneration", duration * 20, { amplifier: amplifier, showParticles: false});
    } catch (err) {
      console.warn(`[回血错误] 应用效果失败: ${err}`);
    }

  }, 40); // 效果开始时间点

  // 结束技能
  system.runTimeout(() => {
    if (entity.isValid()) {
      // 【新增】强制移除再生效果
      try {
        entity.removeEffect("regeneration");
      } catch (err) {
        console.warn(`[回血] 移除效果失败: ${err}`);
      }
      entity.setDynamicProperty(DURING_SKILL_DP, false);
      entity.setDynamicProperty(CD_DP, system.currentTick + 150); // 冷却时间
    }
  }, 100); // 动画时长(约5秒)
}

// 定义变身数据接口 
interface TransformData {
  health: number;
  transformPosition: Vector3; // 仅记录变身时的位置 
}

// 技能：变身为铁傀儡，5秒后变回
function performTransformIntoIronGolem(entity: Entity) {
  // 1. 初始验证
  if (!entity?.isValid()) {
    console.warn(" 变身失败：无效实体");
    return;
  }

  try {
    // 2. 记录变身时boss的位置和血量
    const transformPosition = entity.location;
    const currentHealth = entity.getComponent("health")?.currentValue || 100;

    console.warn(`开始变身为铁傀儡，当前血量: ${Math.floor(currentHealth)}`);

    // 3. 播放变身动画
    try {
      entity.addEffect("slowness", 20, { amplifier: 255, showParticles: false });
    } catch (err) { }

    entity.playAnimation("animation.pixelmind.mutated_boss.transition");

    // 4. 延迟触发变身
    system.runTimeout(() => {
      try {

        // 5. 存储血量数据
        entity.setDynamicProperty("transform_health", currentHealth);

        // 6. 触发变身事件
        entity.triggerEvent("event:transform_iron_golem");

        // 7. 查找变身后的铁傀儡
        const maxAttempts = 5;
        let attempts = 0;
        let found = false; // 避免重复生成

        const checkForGolem = () => {
          if (found) return;
          try {
            const dimension = world.getDimension("overworld");
            const golems = dimension.getEntities({
              type: "mutate:boss_iron_golem",
              location: transformPosition,
              maxDistance: 100
            });

            if (golems.length > 0) {
              found = true;
              const golem = golems[0];

              // 8. 设置铁傀儡血量
              const golemHealth = golem.getComponent("health");
              if (golemHealth) {
                console.warn(`铁傀儡血量: ${Math.floor(currentHealth)}`);
                golemHealth.setCurrentValue(currentHealth);
              }

              // 存储血量数据
              golem.setDynamicProperty("transform_health", currentHealth);

              // 9. 设置5秒后自动变回
              system.runTimeout(() => {
                if (golem.isValid()) {
                  // 获取当前血量
                  const golemCurrentHealth = golem.getComponent("health")?.currentValue || currentHealth;
                  console.warn(`变回前铁傀儡血量: ${Math.floor(golemCurrentHealth)}`);
                  // 保存当前位置
                  const currentPosition = golem.location;
                  // 保存血量
                  golem.setDynamicProperty("transform_health", golemCurrentHealth);
                  // 触发变形事件
                  golem.triggerEvent("mutate:revert");

                  // 延迟一点时间找到新生成的mutated_boss实体
                  system.runTimeout(() => {
                    const dimension = world.getDimension("overworld");
                    const newBosses = dimension.getEntities({
                      type: "mutate:mutated_boss",
                      location: currentPosition,
                      maxDistance: 5
                    });

                    if (newBosses.length > 0) {
                      const newBoss = newBosses[0];

                      // 设置血量
                      const newBossHealth = newBoss.getComponent("health");
                      if (newBossHealth) {
                        console.warn(`变回boss血量: ${Math.floor(golemCurrentHealth)}`);
                        newBossHealth.setCurrentValue(golemCurrentHealth);
                      }

                      // 在新实体上播放变身动画
                      newBoss.playAnimation("animation.pixelmind.mutated_boss.transition");

                      // 设置状态属性
                      newBoss.setDynamicProperty(DURING_SKILL_DP, false);
                      newBoss.setDynamicProperty(CD_DP, system.currentTick + 150);

                      // 通知玩家
                      world.getPlayers().forEach(player => {
                        player.sendMessage("变异怪物恢复了原形！");
                      });
                    }
                  }, 5); // 给实体变形一点时间

                  console.log("health:", golem.getComponent("health")?.currentValue);
                }
              }, 5 * 20);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                system.runTimeout(checkForGolem, 10);
              } else {
                console.error(" 多次尝试后仍未找到铁傀儡");
              }
            }
          } catch (error) {
            console.error(" 铁傀儡处理错误:", error);
          }
        };

        system.runTimeout(checkForGolem, 5);
      } catch (error) {
        console.error(" 变身过程错误:", error);
      }
    }, 20);
  } catch (error) {
    console.error(" 动画播放错误:", error);
  }
}

// 技能：变身末影人，5秒后变回
function performTransformIntoEnderMan(entity: Entity) {
  // 1. 初始验证
  if (!entity?.isValid()) {
    console.warn(" 变身失败：无效实体");
    return;
  }

  try {
    // 2. 记录变身时boss的位置和血量
    const transformPosition = entity.location;
    const currentHealth = entity.getComponent("health")?.currentValue || 200;

    console.warn(`变身为末影人，当前血量: ${Math.floor(currentHealth)}`);

    // 3. 播放变身动画
    try {
      entity.addEffect("slowness", 20, { amplifier: 255, showParticles: false });
    } catch (err) { }

    entity.playAnimation("animation.pixelmind.mutated_boss.transition");

    // 4. 延迟触发变身（等待动画关键帧）
    system.runTimeout(() => {
      try {
        if (!entity.isValid()) {
          return;
        }

        // 5. 存储血量数据
        entity.setDynamicProperty("transform_health", currentHealth);

        // 6. 触发变身事件
        entity.triggerEvent("event:transform_to_enderman");

        // 7. 查找变身后的末影人
        const maxAttempts = 5;
        let attempts = 0;
        let found = false;

        const checkForEnderMan = () => {
          if (found) return;
          try {
            const dimension = world.getDimension("overworld");
            const endermans = dimension.getEntities({
              type: "mutate:boss_enderman",
              location: transformPosition,
              maxDistance: 100
            });

            if (endermans.length > 0) {
              found = true;
              const enderman = endermans[0];

              enderman.triggerEvent("minecraft:entity_spawned");

              // 8. 设置末影人血量
              const endermanHealth = enderman.getComponent("health");
              if (endermanHealth) {
                console.warn(`设置末影人血量: ${Math.floor(currentHealth)}`);
                endermanHealth.setCurrentValue(currentHealth);
              }
              // 存储血量数据
              enderman.setDynamicProperty("transform_health", currentHealth);
              // 9. 设置5秒后自动变回
              system.runTimeout(() => {
                if (enderman.isValid()) {
                  // 获取当前血量
                  const endermanCurrentHealth = enderman.getComponent("health")?.currentValue || currentHealth;
                  console.warn(`变回前末影人血量: ${Math.floor(endermanCurrentHealth)}`);

                  // 保存当前位置
                  const currentPosition = enderman.location;

                  // 保存血量
                  enderman.setDynamicProperty("transform_health", endermanCurrentHealth);
                  enderman.triggerEvent("mutate:revert");

                  // 查找变回后的boss
                  system.runTimeout(() => {
                    const newBosses = dimension.getEntities({
                      type: "mutate:mutated_boss",
                      location: currentPosition,
                      maxDistance: 5
                    });

                    if (newBosses.length > 0) {
                      const newBoss = newBosses[0];

                      // 设置血量
                      const newBossHealth = newBoss.getComponent("health");
                      if (newBossHealth) {
                        console.warn(`设置变回boss血量: ${Math.floor(endermanCurrentHealth)}`);
                        newBossHealth.setCurrentValue(endermanCurrentHealth);
                      }

                      // 播放变身动画
                      newBoss.playAnimation("animation.pixelmind.mutated_boss.transition");

                      // 重置状态
                      newBoss.setDynamicProperty(DURING_SKILL_DP, false);
                      newBoss.setDynamicProperty(CD_DP, system.currentTick + 150);

                      // 通知玩家
                      world.getPlayers().forEach(player => {
                        player.sendMessage("变异怪物恢复了原形！");
                      });
                    }
                  }, 5);
                }
              }, 5 * 20);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                system.runTimeout(checkForEnderMan, 10);
              } else {
                console.error(" 多次尝试后仍未找到末影人");
              }
            }
          } catch (error) {
            console.error(" 末影人处理错误:", error);
          }
        };

        system.runTimeout(checkForEnderMan, 5);
      } catch (error) {
        console.error(" 变身过程错误:", error);
      }
    }, 20);
  } catch (error) {
    console.error(" 动画播放错误:", error);
  }
}

// 变身为烈焰人，5秒后变回
function performTransformIntoBlaze(entity: Entity) {
  // 1. 初始验证
  if (!entity?.isValid()) {
    console.warn("[变身] 无效实体");
    return;
  }

  try {
    // 2. 记录变身时boss的位置和血量
    const transformPosition = entity.location;
    const currentHealth = entity.getComponent("health")?.currentValue || 200;

    console.warn(`变身为烈焰人，当前血量: ${Math.floor(currentHealth)}`);

    // 3. 播放变身动画
    try {
      entity.addEffect("slowness", 20, { amplifier: 255, showParticles: false });
    } catch (err) { }

    entity.playAnimation("animation.pixelmind.mutated_boss.transition");

    // 4. 延迟触发变身
    system.runTimeout(() => {
      try {
        if (!entity.isValid()) return;

        // 5. 存储血量数据
        entity.setDynamicProperty("transform_health", currentHealth);

        // 6. 触发变身事件
        entity.triggerEvent("event:transform_to_blaze");

        // 7. 查找变身后的烈焰人
        const maxAttempts = 5;
        let attempts = 0;
        let found = false;

        const checkForBlaze = () => {
          if (found) return;
          try {
            const dimension = world.getDimension("overworld");
            const blazes = dimension.getEntities({
              type: "mutate:boss_blaze",
              location: transformPosition,
              maxDistance: 10
            });

            if (blazes.length > 0) {
              found = true;
              const blaze = blazes[0];

              blaze.triggerEvent("minecraft:entity_spawned");

              // 8. 设置烈焰人血量
              const blazeHealth = blaze.getComponent("health");
              if (blazeHealth) {
                console.warn(`设置烈焰人血量: ${Math.floor(currentHealth)}`);
                blazeHealth.setCurrentValue(currentHealth);
              }

              // 存储血量数据
              blaze.setDynamicProperty("transform_health", currentHealth);

              // 9. 设置5秒后变回
              system.runTimeout(() => {
                if (!blaze.isValid()) return;

                // 获取当前血量
                const blazeCurrentHealth = blaze.getComponent("health")?.currentValue || currentHealth;
                console.warn(`变回前烈焰人血量: ${Math.floor(blazeCurrentHealth)}`);

                // 保存当前位置
                const currentPosition = blaze.location;

                // 保存血量
                blaze.setDynamicProperty("transform_health", blazeCurrentHealth);

                // 触发变形事件
                blaze.triggerEvent("mutate:revert");

                // 查找变回后的boss
                system.runTimeout(() => {
                  const newBosses = dimension.getEntities({
                    type: "mutate:mutated_boss",
                    location: currentPosition,
                    maxDistance: 5
                  });

                  if (newBosses.length > 0) {
                    const newBoss = newBosses[0];

                    // 设置血量
                    const newBossHealth = newBoss.getComponent("health");
                    if (newBossHealth) {
                      console.warn(`设置变回boss血量: ${Math.floor(blazeCurrentHealth)}`);
                      newBossHealth.setCurrentValue(blazeCurrentHealth);
                    }

                    // 播放变身动画
                    newBoss.playAnimation("animation.pixelmind.mutated_boss.transition");

                    // 重置状态
                    newBoss.setDynamicProperty(DURING_SKILL_DP, false);
                    newBoss.setDynamicProperty(CD_DP, system.currentTick + 150);

                    // 通知玩家
                    world.getPlayers().forEach(player => {
                      player.sendMessage("变异怪物恢复了原形！");
                    });
                  }
                }, 5);
              }, 5 * 20);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                system.runTimeout(checkForBlaze, 10);
              } else {
                console.error("未找到烈焰人");
              }
            }
          } catch (error) {
            console.error(`[变身] 错误: ${error}`);
          }
        };

        system.runTimeout(checkForBlaze, 5);
      } catch (error) {
        console.error(`[变身] 错误: ${error}`);
      }
    }, 20);
  } catch (error) {
    console.error(`[变身] 错误: ${error}`);
  }
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
    weight: 3  // 权重
  },
  {
    name: "铁傀儡变身",
    skill: performTransformIntoIronGolem,
    condition: (entity: Entity, player: Entity) => {
      // 在距离中等范围时使用变身技能
      const distance = Vector3Utils.distance(entity.location, player.location);
      return distance >= 1 && distance <= 15;
    },
    cd: 300, // 冷却
    weight: 3 // 权重
  },
  {
    name: "变身为末影人",
    skill: performTransformIntoEnderMan,
    condition: (entity: Entity, player: Entity) => {
      // 在距离中等范围时使用变身技能
      const distance = Vector3Utils.distance(entity.location, player.location);
      return distance >= 1 && distance <= 15;
    },
    cd: 300, // 冷却
    weight: 3 // 权重
  },
  {
    name: "变身为烈焰人",
    skill: performTransformIntoBlaze,
    condition: (entity: Entity, player: Entity) => {
      // 在距离中等范围时使用变身技能
      const distance = Vector3Utils.distance(entity.location, player.location);
      return distance >= 1 && distance <= 20; // 烈焰人适合远距离，所以范围略大
    },
    cd: 300, // 15秒冷却
    weight: 3 // 权重
  }
  // 添加更多技能
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
