// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import * as fs from "fs";
import { suite, before } from "mocha";
import { createByModelName } from "../src/tokenizerBuilder";
import { TikTokenizer } from "../src/tikTokenizer";
const ENDOFTEXT: string = "<|endoftext|>";
const ENDOFPROMPT: string = "<|endofprompt|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [ENDOFTEXT, 199999],
  [ENDOFPROMPT, 200018]
]);

suite("TikTokenizer gpt-4o Test Suite", function() {
  let tokenizer_gpt4o: TikTokenizer;
  before(async () => {
    tokenizer_gpt4o = await createByModelName("gpt-4o", specialTokens);
  });

  test("tokenize source code - gpt-4o", done => {
    const source = fs.readFileSync("test/testdata/lib.rs.txt", "utf8");
    const filePath = "test/testdata/tokens_gpt_4o.json";

    fs.readFile(filePath, "utf8", (err, data) => {
      assert.strictEqual(err, null);
      const jsonArray = JSON.parse(data) as Array<number>;
      let encoded = tokenizer_gpt4o.encode(
        source,
        Array.from(specialTokens.keys())
      );
      assert.deepStrictEqual(encoded.length, 5609);
      assert.deepStrictEqual(encoded, jsonArray);
      assert.strictEqual(tokenizer_gpt4o.decode(encoded), source);
      done();
    });
  });
});
