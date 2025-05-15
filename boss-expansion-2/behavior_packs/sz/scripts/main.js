import { initZdk } from "./zdk/load";
import { SpawnEntityItem } from "./items/mgr";
import { initEntity, initPlayer } from "./entities/mgr";

import "./structure_block/structure_block";

function main() {
  initZdk();
  initPlayer();
  initEntity();
  SpawnEntityItem.init();
}

main();
