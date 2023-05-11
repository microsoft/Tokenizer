// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import * as fs from "fs";
import { suite, beforeEach } from "mocha";
import { createByEncoderName } from "../src/tokenizerBuilder";
import { TikTokenizer } from "../src/tikTokenizer";
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265]
]);

suite("TikTokenizer r50k_base Test Suite", function() {
  let tokenizer_r50k_base: TikTokenizer;
  beforeEach(async () => {
    tokenizer_r50k_base = await createByEncoderName("r50k_base", specialTokens);
  });

  test("tokenize source code - r50k_base", done => {
    const source = fs.readFileSync("test/testdata/lib.rs.txt", "utf8");
    const filePath = "test/testdata/tokens_r50k_base.json";

    fs.readFile(filePath, "utf8", (err, data) => {
      assert.strictEqual(err, null);
      const jsonArray = JSON.parse(data) as Array<number>;
      let encoded = tokenizer_r50k_base.encode(
        source,
        Array.from(specialTokens.keys())
      );
      assert.deepStrictEqual(encoded.length, 11378);
      assert.deepStrictEqual(encoded, jsonArray);
      assert.strictEqual(tokenizer_r50k_base.decode(encoded), source);
      done();
    });
  });
});
