import { Dimension, Vector3 } from '@minecraft/server';

//在指定位置生成粒子效果

export function spawnParticleEffect(dimension: Dimension, particleName: string, location: Vector3) {
  try {
    dimension.spawnParticle(particleName, location);
  } catch (e) {
    console.warn(`Failed to spawn particle ${particleName}: ${e}`);
  }
}

//创建撞击尘埃效果

export function createImpactDust(dimension: Dimension, location: Vector3) {
  spawnParticleEffect(dimension, 'titan:impact_dust', location);
}