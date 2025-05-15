import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";
import { ModGearMgr } from "../armors/mgr";
import { SPAWN_BUILD_ITEM } from "../items/mgr";

export class ModPlayerMgr extends zdk.ComponentBase {
  onDestory() {
    this.gear.setDestroy();
    this.gear = null;
    this.entity = null;
  }

  constructor(entityId) {
    super(entityId);
    this.entity = mc.world.getEntity(entityId);
    this.gear = new ModGearMgr(entityId);

    // guide book
    let tag_id = "boss_expansion.init";
    if (!this.entity.hasTag(tag_id)) {
      this.entity.addTag(tag_id);
      this.entity.runCommand("/give @s sz_workshop:guide_book");
    }
  }

  tick() {
    this.gear.tick();

    if (!this.entity || !this.entity.isValid()) return;
    const inventory = this.entity.getComponent(
      mc.EntityComponentTypes.Inventory
    ).container;
    const item = inventory.getItem(this.entity.selectedSlotIndex);
    let item_id = item?.typeId;
    if (!item_id || !SPAWN_BUILD_ITEM.includes(item_id)) return;
    this.entity.runCommand(
      `/title @s actionbar Once this seal touches the ground\nit will destroy the surrounding blocks.`
    );
  }
}
