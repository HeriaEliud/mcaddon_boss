//在指定位置生成粒子效果
export function spawnParticleEffect(dimension, particleName, location) {
    try {
        dimension.spawnParticle(particleName, location);
    }
    catch (e) {
        console.warn(`Failed to spawn particle ${particleName}: ${e}`);
    }
}
//创建撞击尘埃效果
export function createImpactDust(dimension, location) {
    spawnParticleEffect(dimension, 'titan:impact_dust', location);
}
//# sourceMappingURL=particle_fx.js.map