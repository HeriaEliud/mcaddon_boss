// scripts/state/dynamic_property.ts
import { world, Entity } from '@minecraft/server';

export const PROPERTIES = {
  ATTACK_TIME: 'attack_time',
  SPECIAL_COOLDOWN: 'special_cooldown'
};

export function getNumberProperty(entity: Entity, name: string): number {
  try {
    return entity.getDynamicProperty(name) as number || 0;
  } catch (e) {
    return 0;
  }
}

export function setNumberProperty(entity: Entity, name: string, value: number): void {
  entity.setDynamicProperty(name, value);
}