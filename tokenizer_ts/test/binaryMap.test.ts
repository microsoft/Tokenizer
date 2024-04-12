// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import { BinaryMap } from "../src/bytePairEncode";
suite("BinaryMap Test Suite", function() {
    test("Test basic input to map - one level", done => {
        const binMap: BinaryMap<number> =  new BinaryMap<number>();
        binMap.set(new Uint8Array([1, 50, 24]), 1);
        assert(binMap.get(new Uint8Array([1, 50, 24])) === 1);
        assert(binMap.get(new Uint8Array([1, 50])) === undefined);
        assert(binMap.get(new Uint8Array([1, 50, 24,100])) === undefined);

        binMap.set(new Uint8Array([1, 50, 24,100]), 100);
        assert(binMap.get(new Uint8Array([1, 50, 24,100])) === 100);
        done();
    });
    test("Test basic input to map - one or two levels", done => {
        const binMap: BinaryMap<number> =  new BinaryMap<number>();
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23]), 1);
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40]), 2);
        binMap.set(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40, 21 ,54, 232]), 3);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23])) === 1);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40])) === 2);
        assert(binMap.get(new Uint8Array([1, 50, 24, 34, 64, 23, 60, 120, 40, 21 ,54, 232])) === 3);
        done();
    });
    test("Test `get` with start and end specified", done => {
        const binMap: BinaryMap<number> =  new BinaryMap<number>();
        binMap.set(new Uint8Array([64, 23]), 100);
        binMap.set(new Uint8Array([1, 50, 24]), 1);
        binMap.set(new Uint8Array([24, 34, 64]), 2);
        binMap.set(new Uint8Array([23, 60, 120, 1, 50, 24]), 255);
        const mainArray = new Uint8Array([ 64, 23, 60, 120, 1, 50, 24, 34, 64]);
        assert(binMap.get(mainArray, 4, 7) === 1);
        assert(binMap.get(mainArray, 6, 9) === 2);
        assert(binMap.get(mainArray, 1, 7) === 255);
        assert(binMap.get(mainArray, 7, 7) === undefined);
        assert(binMap.get(mainArray, 6, 10) === 2);
        assert(binMap.get(mainArray, 0, 2) === 100);
        done();
    });
  });
  