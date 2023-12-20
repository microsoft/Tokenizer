// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import * as fs from "fs";
import { suite, before } from "mocha";
import { createByModelName } from "../src/tokenizerBuilder";
import { TikTokenizer } from "../src/tikTokenizer";
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265]
]);

suite("TikTokenizer Test Suite", function() {
  let tokenizer: TikTokenizer;
  before(async () => {
    tokenizer = await createByModelName("gpt-3.5-turbo", specialTokens);
  });

  test("!", () => {
    const str = "!";
    let encoded = tokenizer.encode(str);
    assert.deepStrictEqual(encoded, [0]);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("empty string", () => {
    const str = "";
    let encoded = tokenizer.encode(str);
    assert.deepStrictEqual(encoded, []);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("hello world", () => {
    const str = "Hello World!";
    let encoded = tokenizer.encode(str);
    assert.deepStrictEqual(encoded, [9906, 4435, 0]);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("special tokens - 1", () => {
    const str = "<|im_start|>Hello World<|im_end|>";
    let encoded = tokenizer.encode(str, Array.from(specialTokens.keys()));
    assert.deepStrictEqual(encoded, [100264, 9906, 4435, 100265]);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("special tokens - 2", () => {
    const str = "<|im_start|>Hello<|im_end|> World";
    let encoded = tokenizer.encode(str, Array.from(specialTokens.keys()));
    assert.deepStrictEqual(encoded, [100264, 9906, 100265, 4435]);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("special tokens with unicode", () => {
    const str = "<|im_start|>Hello ⭐ World<|im_end|>";
    let encoded = tokenizer.encode(str, Array.from(specialTokens.keys()));
    assert.deepStrictEqual(encoded, [100264, 9906, 2928, 99834, 4435, 100265]);
    assert.strictEqual(tokenizer.decode(encoded), str);
  });

  test("encode trim suffix", () => {
    const str = "<|im_start|>Hello World<|im_end|>";
    const encodedStr = "<|im_start|>Hello World";
    let encoded = tokenizer.encodeTrimSuffix(
      str,
      4,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 4435, 100265]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimSuffix(
      str,
      5,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 4435, 100265]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimSuffix(
      str,
      3,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 4435]);
    assert.deepStrictEqual(encoded.text, encodedStr);
  });

  test("encode trim suffix - 2", () => {
    const str = "<|im_start|>Hello TempWorld<|im_end|>";
    const encodedStr = "<|im_start|>Hello TempWorld";
    let encoded = tokenizer.encodeTrimSuffix(
      str,
      5,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [
      100264,
      9906,
      20539,
      10343,
      100265
    ]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimSuffix(
      str,
      6,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [
      100264,
      9906,
      20539,
      10343,
      100265
    ]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimSuffix(
      str,
      3,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 20539]);
    assert.deepStrictEqual(encoded.text, encodedStr);
  });

  test("encode trim suffix - 3", () => {
    const str = "t".repeat(4000);
    const encodedStr = tokenizer.encode(str);
    let encodedTrimSuffix = tokenizer.encodeTrimSuffix(str, 5, []);
    assert.deepStrictEqual(encodedTrimSuffix.tokenIds.length, 5);
    assert.deepStrictEqual(encodedTrimSuffix.tokenIds, encodedStr.slice(0, 5));
  });

  test("encode trim prefix", () => {
    const str = "<|im_start|>Hello World<|im_end|>";
    const encodedStr = "Hello World<|im_end|>";
    let encoded = tokenizer.encodeTrimPrefix(
      str,
      4,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 4435, 100265]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimPrefix(
      str,
      5,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [100264, 9906, 4435, 100265]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimPrefix(
      str,
      3,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [9906, 4435, 100265]);
    assert.deepStrictEqual(encoded.text, encodedStr);
  });

  test("encode trim prefix - 2", () => {
    const str = "<|im_start|>HelloTemp World<|im_end|>";
    const encodedStr = " World<|im_end|>";
    let encoded = tokenizer.encodeTrimPrefix(
      str,
      5,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [
      100264,
      9906,
      12427,
      4435,
      100265
    ]);
    assert.deepStrictEqual(encoded.text, str);

    encoded = tokenizer.encodeTrimPrefix(
      str,
      6,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [
      100264,
      9906,
      12427,
      4435,
      100265
    ]);
    assert.deepStrictEqual(encoded.text, str);

    const testEncode = tokenizer.encode(str, Array.from(specialTokens.keys()));
    encoded = tokenizer.encodeTrimPrefix(
      str,
      3,
      Array.from(specialTokens.keys())
    );
    assert.deepStrictEqual(encoded.tokenIds, [4435, 100265]);
    assert.deepStrictEqual(encoded.text, encodedStr);
  });

  test("encode trim prefix - 3", () => {
    const str = "t".repeat(4000);
    const encodedStr = tokenizer.encode(str);
    let encodedTrimSuffix = tokenizer.encodeTrimPrefix(str, 5, []);
    assert.deepStrictEqual(encodedTrimSuffix.tokenIds.length, 5);
    assert.deepStrictEqual(encodedTrimSuffix.tokenIds, encodedStr.slice(encodedStr.length - 5));
  });

  test("tokenize source code - gpt-3.5", done => {
    const source = fs.readFileSync("test/testdata/lib.rs.txt", "utf8");
    const filePath = "test/testdata/tokens_gpt_3.5_turbo.json";

    fs.readFile(filePath, "utf8", (err, data) => {
      assert.strictEqual(err, null);
      const jsonArray = JSON.parse(data) as Array<number>;
      let encoded = tokenizer.encode(source, Array.from(specialTokens.keys()));
      assert.deepStrictEqual(encoded.length, 5584);
      assert.deepStrictEqual(encoded, jsonArray);
      assert.strictEqual(tokenizer.decode(encoded), source);
      done();
    });
  });
});
