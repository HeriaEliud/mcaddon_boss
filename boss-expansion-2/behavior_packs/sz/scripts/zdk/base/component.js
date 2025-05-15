import { Entity } from "@minecraft/server";

export class ComponentBase {
    entity;
    #isActive;

    constructor(entityId) {
        this.entityId = entityId;
        this.#isActive = false;
    }

    onAwake() {}
    onAsleep() {}
    onDestory() {}

    setAwake() {
        if (this.#isActive) return;
        this.#isActive = true;
        this.onAwake();
    }
    setAsleep() {
        if (!this.#isActive) return;
        this.#isActive = false;
        this.onAsleep();
    }
    setDestroy() {
        this.setAsleep();
        this.onDestory();
    }

    isActive() {return this.#isActive}
}
