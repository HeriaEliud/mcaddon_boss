import { world, GameMode } from "@minecraft/server";


// 检查并加载结构
function checkAndLoadStructure(entityType, structureName, x, y, z, dimension) {
    let entityCount = 0;
    
    if (entityType) {
        const entities = dimension.getEntities({
            location: { x, y, z },
            minDistance: 0,
            maxDistance: 64,
            type: entityType
        });
        entityCount = entities.length;
    }

    // console.warn(`${structureName}, 位置 ${x}, ${y}, ${z}, 周围NPC数量: ${entityCount}`);
    
    if (!entityType || entityCount === 0) {
        dimension.runCommand(`structure load boss_expansion:${structureName} ${x} ${y} ${z} 0_degrees none true false`);
        // console.warn(`${entityType ? entityType : 'default'} spawn`);
    }

    dimension.runCommand(`setblock ${x} ${y} ${z} air`);
}




const arcaneAxolotlBlock = {
    onTick(event) {
        const { x, y, z } = event.block.location;
        checkAndLoadStructure('sz_workshop:arcane_axolotl', 'arcane_axolotl_small', x, y, z, event.dimension);
    }
};

// const knarfyBossBlock = {
//     onTick(event) {
//         const { x, y, z } = event.block.location;
//         checkAndLoadStructure('sz_workshop:knarfy_boss', 'knarfy_boss_small', x, y, z, event.dimension);
//     }
// };

const thePharoahBlock = {
    onTick(event) {
        const { x, y, z } = event.block.location;
        checkAndLoadStructure('sz_workshop:mummy', 'the_pharoah_small', x, y, z, event.dimension);
    }
};



// 注册
world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent("sz_workshop:arcane_axolotl", arcaneAxolotlBlock);
    // blockComponentRegistry.registerCustomComponent("sz_workshop:knarfy_boss", knarfyBossBlock);
    blockComponentRegistry.registerCustomComponent("sz_workshop:the_pharoah", thePharoahBlock);
});