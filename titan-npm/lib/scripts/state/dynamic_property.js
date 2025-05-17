export const PROPERTIES = {
    ATTACK_TIME: 'attack_time',
    SPECIAL_COOLDOWN: 'special_cooldown'
};
export function getNumberProperty(entity, name) {
    try {
        return entity.getDynamicProperty(name) || 0;
    }
    catch (e) {
        return 0;
    }
}
export function setNumberProperty(entity, name, value) {
    entity.setDynamicProperty(name, value);
}
//# sourceMappingURL=dynamic_property.js.map