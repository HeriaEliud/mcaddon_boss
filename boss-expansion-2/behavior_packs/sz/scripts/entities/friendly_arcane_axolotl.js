import { world, system, ItemStack, Entity } from "@minecraft/server";
import * as mc from "@minecraft/server";



system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity: entity, message } = event;


    if (id === 'sz:on_tame') {
        let tameComp = entity.getComponent(mc.EntityComponentTypes.Tameable);
            tameComp.tame(player);

        for (let player of entity.dimension.getEntities({
            families: ["player"],
            maxDistance: 16,
            })) {
                // mc.world.sendMessage(`taming entity ${entity.id} -> ${player.id}`);
                tameComp.tame(player);
                entity.triggerEvent("event:on_tame");
            }
    }
    
});