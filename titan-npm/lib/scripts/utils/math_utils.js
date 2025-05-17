// scripts/utils/math_utils.ts
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
//# sourceMappingURL=math_utils.js.map