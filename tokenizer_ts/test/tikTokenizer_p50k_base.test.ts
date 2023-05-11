// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import * as fs from "fs";
import { suite, before } from "mocha";
import { createByEncoderName } from "../src/tokenizerBuilder";
import { TikTokenizer } from "../src/tikTokenizer";
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265]
]);

suite("TikTokenizer p50k_base Test Suite", function() {
  let tokenizer_p50k_base: TikTokenizer;
  before(async () => {
    tokenizer_p50k_base = await createByEncoderName("p50k_base", specialTokens);
  });

  test("tokenize source code - p50k_base", done => {
    const source = fs.readFileSync("test/testdata/lib.rs.txt", "utf8");
    const filePath = "test/testdata/tokens_p50k_base.json";

    fs.readFile(filePath, "utf8", (err, data) => {
      assert.strictEqual(err, null);
      const jsonArray = JSON.parse(data) as Array<number>;
      let encoded = tokenizer_p50k_base.encode(
        source,
        Array.from(specialTokens.keys())
      );
      assert.deepStrictEqual(encoded.length, 7230);
      assert.deepStrictEqual(encoded, jsonArray);
      assert.strictEqual(tokenizer_p50k_base.decode(encoded), source);
      done();
    });
  });
});
