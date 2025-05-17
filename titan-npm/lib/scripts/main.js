import "./entities/titan";
import "./state/dynamic_property";
import "./utils/math_utils";
import "./utils/vector_utils";
// // 防止脚本终止 - 使用正确的 API
// system.events.beforeWatchdogTerminate.subscribe(event => {
//   event.cancel = true;
//   console.warn("Prevented script termination: ", event.terminateReason);
// });
// // 使用最新的推荐 API 替代已弃用的 worldInitialize
// system.runOnce(() => {
//   console.log("Titan addon initialized!");
// });
// // 监听玩家加入游戏事件
// world.afterEvents.playerSpawn.subscribe((event) => {
//   if (event.initialSpawn) {
//     console.log(`Player ${event.player.name} joined the world!`);
//   }
// });
//# sourceMappingURL=main.js.map