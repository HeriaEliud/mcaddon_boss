import { system } from '@minecraft/server';

/**
 * 按顺序运行一系列超时回调函数
 * @param callback 回调函数
 * @param times 时间点数组（单位：tick）
 */
export function runTimeoutSeries(callback: () => void, times: number[]) {
  times.forEach(time => {
    system.runTimeout(callback, time);
  });
}