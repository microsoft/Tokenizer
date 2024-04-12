// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import { BinaryMap, binaryMapKey } from "../src/bytePairEncode";
suite("BinaryMap Test Suite", function () {
    test("Test basic input to map - one level", done => {
        const binMap: BinaryMap<number> = new BinaryMap<number>();
        binMap.set(new Uint8Array([1, 50, 24]), 1);
        assert(binMap.get(new Uint8Array([1, 50, 24])) === 1);
        assert(binMap.get(new Uint8Array([1, 50])) === undefined);
        assert(binMap.get(new Uint8Array([1, 50, 24, 100])) === undefined);

        binMap.set(new Uint8Array([1, 50, 24, 100]), 100);
        assert(binMap.get(new Uint8Array([1, 50, 24, 100])) === 100);
        done();
    });
    test("Test basic input to map - one or two levels", done => {
        const binMap: BinaryMap<number> = new BinaryMap<number>();
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23]), 1);
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40]), 2);
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40, 21, 54, 232]), 3);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23])) === 1);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40])) === 2);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40, 21, 54, 232])) === 3);
        done();
    });
    test("Test `get` with start and end specified", done => {
        const binMap: BinaryMap<number> = new BinaryMap<number>();
        binMap.set(new Uint8Array([64, 23]), 100);
        binMap.set(new Uint8Array([1, 50, 24]), 1);
        binMap.set(new Uint8Array([24, 34, 64]), 2);
        binMap.set(new Uint8Array([23, 60, 120, 1, 50, 24]), 255);
        const mainArray = new Uint8Array([64, 23, 60, 120, 1, 50, 24, 34, 64]);
        assert(binMap.get(mainArray, 4, 7) === 1);
        assert(binMap.get(mainArray, 6, 9) === 2);
        assert(binMap.get(mainArray, 1, 7) === 255);
        assert(binMap.get(mainArray, 7, 7) === undefined);
        assert(binMap.get(mainArray, 6, 10) === 2);
        assert(binMap.get(mainArray, 0, 2) === 100);
        done();
    });
});
suite("Binary Map Key Function Test", function () {
    test("First 3 Max Bytes", done => {
        const arr = new Uint8Array([0xFF, 0xFF, 0xFF, 0xAB, 0xCD, 0xEF]);
        const result = binaryMapKey(arr, 0, arr.length);
        assert.strictEqual(result, 0xEFCDABFFFFFF);
        done();
    });

    test("All 6 Max Bytes", done => {
        const arr = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
        const result = binaryMapKey(arr, 0, arr.length);
        assert.strictEqual(result, 0xFFFFFFFFFFFF);
        done();
    });

    test("First 3 Min Bytes", done => {
        const arr = new Uint8Array([0x00, 0x00, 0x00, 0xAB, 0xCD, 0xEF]);
        const result = binaryMapKey(arr, 0, arr.length);
        assert.strictEqual(result, 0xEFCDAB000000);
        done();
    });

    test("Last 3 Min Bytes", done => {
        const arr = new Uint8Array([0xAB, 0xCD, 0xEF, 0x00, 0x00, 0x00]);
        const result = binaryMapKey(arr, 0, arr.length);
        assert.strictEqual(result, 0x000000EFCDAB);
        done();
    });

    test("Assorted Bytes", done => {
        const arr = new Uint8Array([0xBA, 0xDC, 0xFE, 0xEF, 0xCD, 0xAB]);
        const result = binaryMapKey(arr, 0, arr.length);
        assert.strictEqual(result, 0xABCDEFFEDCBA);
        done();
    });

    test("Assorted Bytes with start/end defined in lower bits", done => {
        const arr = new Uint8Array([0xBA, 0xDC, 0xFE, 0xEF, 0xCD, 0xAB]);
        const result = binaryMapKey(arr, 1, 3);
        assert.strictEqual(result, 0x00000000FEDC);
        done();
    });

    test("Assorted Bytes with start/end defined in upper bits", done => {
        const arr = new Uint8Array([0xBA, 0xDC, 0xFE, 0xEF, 0xCD, 0xAB]);
        const result = binaryMapKey(arr, 3, 6);
        assert.strictEqual(result, 0x000000ABCDEF);
        done();
    });

    test("Assorted Bytes with start/end defined across upper and lower bits", done => {
        const arr = new Uint8Array([0xBA, 0xDC, 0xFE, 0xEF, 0xCD, 0xAB]);
        const result = binaryMapKey(arr, 2, 5);
        assert.strictEqual(result, 0x000000CDEFFE);
        done();
    });
});  
