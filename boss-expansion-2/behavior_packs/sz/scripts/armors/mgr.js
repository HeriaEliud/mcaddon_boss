import * as mc from "@minecraft/server";
import * as zdk from "../zdk/index";

var IS_ACTIVE = false;
const ENTITY_MAP = new Map();

const SLOT_LIST = [
  mc.EquipmentSlot.Head,
  mc.EquipmentSlot.Chest,
  mc.EquipmentSlot.Legs,
  mc.EquipmentSlot.Feet,
];

const GEAR_PREFIX = "sz_workshop";
const GEAR_REQUIRE_MAP = new Map([
  ["champion_belt", 2],
  ["emit_plate", 4],
  ["fur_coat_armor", 4],
  ["magical_robe", 4],
  ["verdant_plate", 4],
]);

function startListenEvent() {
  if (IS_ACTIVE) return;
  IS_ACTIVE = true;

  mc.world.afterEvents.entityHurt.subscribe((event) => {
    let entity = event.hurtEntity;
    if (entity && ENTITY_MAP.has(entity.id)) {
      let mgr = ENTITY_MAP.get(entity.id);
      if (mgr.setInstance) {
        mgr.setInstance.onHurt();
      }
    }
  });
}

export class ModGearMgr extends zdk.ComponentBase {
  activeSet;

  onDestory() {
    this.entity = null;
    this.setInstance = null;
    ENTITY_MAP.delete(this.entityId);
  }

  constructor(entityId) {
    super(entityId);
    this.entity = mc.world.getEntity(this.entityId);
    this.activeSet = null;
    this.setInstance = null;
    ENTITY_MAP.set(this.entityId, this);
    startListenEvent();
  }

  tick() {
    this.check();
    if (this.setInstance) {
      this.setInstance.tick();
    }
  }

  on_activate_set(setName) {
    if (setName === "fur_coat_armor")
      this.setInstance = new FurCoatArmorEffect(this.entityId);
    if (setName === "emit_plate")
      this.setInstance = new EmitPlateArmorEffect(this.entityId);
    if (setName === "champion_belt")
      this.setInstance = new ChampionBeltArmorEffect(this.entityId);
    if (setName === "verdant_plate")
      this.setInstance = new VerdantPlaterArmorEffect(this.entityId);
    if (setName === "magical_robe")
      this.setInstance = new MagicalRobeArmorEffect(this.entityId);
  }
  on_deactivate_set(setName) {
    this.setInstance = null;
  }

  check() {
    let equipment = this.entity.getComponent(
      mc.EntityComponentTypes.Equippable
    );
    let equippedItems = new Map();

    SLOT_LIST.forEach((slot) => {
      let item = equipment.getEquipment(slot);
      if (item) {
        let itemId = item.typeId;
        let [prefix, setName] = itemId.split(":");

        if (prefix !== GEAR_PREFIX) return;

        setName = setName.replace(/_(helmet|chestplate|leggings|boots)/, "");
        if (!equippedItems.has(setName)) {
          equippedItems.set(setName, 0);
        }
        equippedItems.set(setName, equippedItems.get(setName) + 1);
      }
    });

    let maxCount = 0;
    let maxSetName = null;

    for (const [setName, count] of equippedItems) {
      if (count > maxCount && GEAR_REQUIRE_MAP.has(setName)) {
        maxCount = count;
        maxSetName = setName;
      }
    }

    if (maxSetName && maxCount === GEAR_REQUIRE_MAP.get(maxSetName)) {
      if (this.activeSet !== maxSetName) {
        if (this.activeSet) {
          this.on_deactivate_set(this.activeSet);
        }
        this.activeSet = maxSetName;
        this.on_activate_set(this.activeSet);
      }
      return true;
    }

    if (this.activeSet) {
      this.on_deactivate_set(this.activeSet);
      this.activeSet = null;
    }
    return false;
  }
}

class ArmorEffectBase extends zdk.ComponentBase {
  onDestory() {
    this.entity = null;
  }
  constructor(entityId) {
    super(entityId);
    this.entity = mc.world.getEntity(this.entityId);
  }
  tick() {}
  onHurt() {}
}

const ADD_SPEED_BLOCK = [
  "minecraft:ice",
  "minecraft:blue_ice",
  "minecraft:frosted_ice",
  "minecraft:packed_ice",
  "minecraft:snow",
  "minecraft:snow_layer",
];

class FurCoatArmorEffect extends ArmorEffectBase {
  constructor(entityId) {
    super(entityId);
    this.is_add_speed = false;
  }
  tick() {
    this.entity.addEffect("resistance", 1 * 20, {
      amplifier: 1,
      showParticles: false,
    });
    this.entity.addEffect("strength", 1 * 20, {
      amplifier: 1,
      showParticles: false,
    });
    let location = this.entity.location;
    location.y -= 1;
    let blockName = this.entity.dimension.getBlock(location).typeId;
    if (ADD_SPEED_BLOCK.includes(blockName)) {
      this.is_add_speed = true;
      this.entity.addEffect("speed", 1 * 20, {
        amplifier: 1,
        showParticles: false,
      });
    } else if (this.is_add_speed) {
      this.is_add_speed = false;
      this.entity.removeEffect("speed");
    }
  }
}

class EmitPlateArmorEffect extends ArmorEffectBase {
  constructor(entityId) {
    super(entityId);
    this.skill_cd = 0;
  }
  onHurt() {
    if (Date.now() < this.skill_cd) return;
    this.skill_cd = Date.now() + 12 * 1000;

    let location = this.entity.location;
    let dimension = this.entity.dimension;
    dimension.spawnParticle("sz_workshop:kraken_ink_clouds_01", location);
    dimension.spawnParticle("sz_workshop:kraken_ink_clouds_02", location);
    dimension.playSound("sz_workshop.effect_armors_emit_plate", location);

    for (let victim of dimension.getEntities({
      excludeFamilies: ["player"],
      location: location,
      maxDistance: 6,
    })) {
      victim.addEffect("blindness", 5 * 20, {
        amplifier: 1,
        showParticles: false,
      });
      victim.addEffect("weakness", 5 * 20, {
        amplifier: 1,
        showParticles: false,
      });
    }
  }
  tick() {
    if (
      this.entity.dimension.getBlock(this.entity.location).typeId ===
      "minecraft:water"
    ) {
      this.entity.addEffect("speed", 1 * 20, {
        amplifier: 1,
        showParticles: false,
      });
      this.entity.addEffect("water_breathing", 1 * 20, {
        amplifier: 1,
        showParticles: false,
      });
    }
  }
}

class ChampionBeltArmorEffect extends ArmorEffectBase {
  constructor(entityId) {
    super(entityId);
    this.ability_cd = 0;
  }
  onHurt() {
    this.entity.applyKnockback(0, 0, -3, 0);

    if (Date.now() < this.skill_cd) return;
    this.skill_cd = Date.now() + 30 * 1000;
    this.entity.addEffect("absorption", 20 * 20, {
      amplifier: 1,
      showParticles: false,
    });
  }
  tick() {
    this.entity.addEffect("strength", 20 * 20, {
      amplifier: 1,
      showParticles: false,
    });
    this.entity.addEffect("speed", 20 * 20, {
      amplifier: 0,
      showParticles: false,
    });
    this.entity.addEffect("resistance", 20 * 20, {
      amplifier: 1,
      showParticles: false,
    });
  }
}
class VerdantPlaterArmorEffect extends ArmorEffectBase {
  constructor(entityId) {
    super(entityId);
    this.skill_cd = 0;
  }
  onHurt() {
    this.entity.addEffect("instant_health", 1 * 20, {
      amplifier: 1,
      showParticles: false,
    });
    this.entity.addEffect("saturation", 1 * 20, {
      amplifier: 1,
      showParticles: false,
    });
  }
  tick() {
    if (Date.now() < this.skill_cd) return;
    this.skill_cd = Date.now() + 1 * 1000;
    this.entity.addEffect("regeneration", 1 * 20, {
      amplifier: 1,
      showParticles: false,
    });
  }
}

class MagicalRobeArmorEffect extends ArmorEffectBase {
  constructor(entityId) {
    super(entityId);
    this.skill_cd = 0;
  }
  tick() {
    this.entity.addEffect("fire_resistance", 1 * 20, {
      amplifier: 0,
      showParticles: false,
    });
    this.entity.addEffect("water_breathing", 1 * 20, {
      amplifier: 0,
      showParticles: false,
    });

    if (Date.now() < this.skill_cd) return;
    this.skill_cd = Date.now() + 3 * 1000;
    this.entity.addEffect("resistance", 1 * 20, {
      amplifier: 255,
      showParticles: false,
    });
    let location = this.entity.location;
    let dimension = this.entity.dimension;
    dimension.spawnParticle("sz_workshop:magical_robe_01", location);
    dimension.spawnParticle("sz_workshop:magical_robe_02", location);
    dimension.spawnParticle("sz_workshop:magical_robe_03", location);
    dimension.spawnParticle("sz_workshop:magical_robe_04", location);
    dimension.playSound("sz_workshop.effect_magical_robe", location);
  }
}
