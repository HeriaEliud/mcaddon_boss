/**
 * 从数组中随机选择一个项
 * @param array 选择源数组
 * @param weights 可选的权重数组，长度应与源数组相同
 * @returns 选中的项
 */
export function randomPick<T>(array: T[], weights?: number[]): T | undefined{
  if (!array.length) return undefined;
  if (array.length === 1) return array[0];
  
  if (!weights || weights.length !== array.length) {
    // 无权重或权重长度不匹配时，等概率选择
    return array[Math.floor(Math.random() * array.length)];
  }
  
  // 计算总权重
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // 随机选择点
  let random = Math.random() * totalWeight;
  
  // 寻找落点
  for (let i = 0; i < array.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return array[i];
    }
  }
  
  // 防止浮点误差导致无法选择，默认返回最后一项
  return array[array.length - 1];
}

/**
 * 生成等差数列
 * @param count 项数
 * @param startTime 起始值
 * @param step 步长
 */
export function generateArray(count: number, startTime: number, step: number = 1): number[] {
  return Array.from({ length: count }, (_, i) => startTime + i * step);
}