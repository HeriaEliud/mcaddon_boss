import { Coroutine } from "./base/coroutine";
import { system } from "@minecraft/server";

function tickZdk() {
  Coroutine.tick();
}

export function initZdk() {
  system.runInterval(() => tickZdk(), 1);
}
