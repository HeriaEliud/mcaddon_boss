import * as mc from "@minecraft/server"


export function spawnItem(entity, item_id, count=1) {
    mc.world.getDimension(entity.dimension.id).spawnItem(new mc.ItemStack(item_id, count), entity.location);
}