// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import { LRUCache } from "../src/lru";

suite("LRUCache", function() {
  test("get and set", () => {
    const cache = new LRUCache<number>(3);
    cache.set("key1", 1);
    cache.set("key2", 2);
    cache.set("key3", 3);

    assert.strictEqual(cache.get("key1"), 1);
    assert.strictEqual(cache.get("key2"), 2);
    assert.strictEqual(cache.get("key3"), 3);
  });

  test("get non-existent key", () => {
    const cache = new LRUCache<number>(3);
    cache.set("key1", 1);
    cache.set("key2", 2);
    cache.set("key3", 3);

    assert.strictEqual(cache.get("key4"), undefined);
  });

  test("set existing key", () => {
    const cache = new LRUCache<number>(3);
    cache.set("key1", 1);
    cache.set("key2", 2);
    cache.set("key3", 3);

    cache.set("key2", 20);

    assert.strictEqual(cache.get("key2"), 20);
  });

  test("eviction", () => {
    const cache = new LRUCache<number>(3);
    cache.set("key1", 1);
    cache.set("key2", 2);
    cache.set("key3", 3);
    cache.set("key4", 4);

    assert.strictEqual(cache.get("key1"), undefined);
    assert.strictEqual(cache.get("key2"), 2);
    assert.strictEqual(cache.get("key3"), 3);
    assert.strictEqual(cache.get("key4"), 4);
  });
});
