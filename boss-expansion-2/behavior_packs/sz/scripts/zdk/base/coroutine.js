const coroutines = new Map();
const add_coroutine = new Map();
const recall_map = new Map();

export function startCoroutine(func, recall = null) {
  Coroutine.start(func, recall);
}

export function stopCoroutine(key) {
  Coroutine.stop(key);
}

export class Coroutine {
  static tick() {
    if (add_coroutine.size > 0) {
      for (let [key, value] of add_coroutine) {
        coroutines.set(key, value);
      }
      add_coroutine.clear();
    }

    let ended = [];
    for (let [key, value] of coroutines) {
      if (value.value > 0) {
        coroutines.set(key, { value: value.value - 1, done: false });
      } else {
        try {
          let newValue = key.next();
          coroutines.set(key, newValue);
        } catch (e) {
          ended.push(key);
        }
      }
    }

    for (let key of ended) {
      Coroutine.stop(key);
    }
  }

  static stop(key) {
    if (!coroutines.has(key)) return;
    coroutines.delete(key);
    if (recall_map.has(key)) {
      let func = recall_map.get(key);
      func();
      recall_map.delete(key);
    }
  }

  static start(func, recall = null) {
    let key = func();
    if (recall) {
      recall_map.set(key, recall);
    }
    add_coroutine.set(key, key.next());
  }
}
