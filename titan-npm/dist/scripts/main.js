// scripts/entities/titan.ts
import { world } from "@minecraft/server";

// scripts/utils/string_utils.ts
function addNamespace(name) {
  return `titan:${name}`;
}

// scripts/fx/particle_fx.ts
function spawnParticleEffect(dimension, particleName, location) {
  try {
    dimension.spawnParticle(particleName, location);
  } catch (e) {
    console.warn(`Failed to spawn particle ${particleName}: ${e}`);
  }
}
function createImpactDust(dimension, location) {
  spawnParticleEffect(dimension, "titan:impact_dust", location);
}

// scripts/entities/titan.ts
var TITAN_ID = addNamespace("earth_titan");
world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId !== TITAN_ID) {
    return;
  }
  world.getPlayers().forEach((player) => {
    player.sendMessage(`Titan entity spawned at: ${entity.location.x}, ${entity.location.y}, ${entity.location.z}`);
  });
});
world.afterEvents.entityHitEntity.subscribe((event) => {
  if (event.damagingEntity && event.damagingEntity.typeId === TITAN_ID && event.hitEntity.typeId !== TITAN_ID) {
    const attacker = event.damagingEntity;
    const target = event.hitEntity;
    console.log(`Titan hit entity: ${target.typeId}`);
    const hitLocation = {
      // 在两个实体之间计算接触点，略微偏向目标
      x: target.location.x + (attacker.location.x - target.location.x) * 0.3,
      y: target.location.y + (target.getHeadLocation().y - target.location.y) * 1.6,
      // 大约在胸部位置
      z: target.location.z + (attacker.location.z - target.location.z) * 0.3
    };
    createImpactDust(target.dimension, hitLocation);
  }
});
console.log("Titan entity script loaded");

//# sourceMappingURL=../debug/main.js.map
