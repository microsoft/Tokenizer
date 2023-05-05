// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from 'assert';
import * as fs from 'fs';
import { suite, beforeEach } from 'mocha';
import {
    createByModelName
} from '../src/tokenizerBuilder';
import { TikTokenizer } from '../src/tikTokenizer';
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
    [IM_START, 100264],
    [IM_END, 100265],
]);

suite('TikTokenizer gpt2 Test Suite', function () {
    let tokenizer_gpt2: TikTokenizer;
    beforeEach(async () => {
        tokenizer_gpt2 = await createByModelName("gpt2", specialTokens);
    });

    test('tokenize source code - gpt-2', () => {
        let source = fs.readFileSync('test/testdata/lib.rs.txt', 'utf8');
        const filePath = 'test/testdata/tokens_gpt2.json';

        fs.readFile(filePath, 'utf8', (err, data) => {
            assert.strictEqual(err, null);
            const jsonArray = JSON.parse(data) as Array<number>;
            let encoded = tokenizer_gpt2.encode(source, Array.from(specialTokens.keys()));
            assert.deepStrictEqual(encoded.length, 11378);
            assert.deepStrictEqual(encoded, jsonArray);
            assert.strictEqual(tokenizer_gpt2.decode(encoded), source)
        });
    });
});
