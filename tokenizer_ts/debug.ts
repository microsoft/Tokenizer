import { createByModelName } from "./src/tokenizerBuilder.js";
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265]
]);

const str = "<|im_start|>Hello World<|im_end|>";

let tokenizer = null;
const createTokenizer = async () => {
  tokenizer = await createByModelName("gpt-3.5-turbo", specialTokens);
  var out1 = tokenizer.encode(str, Array.from(specialTokens.keys()));
  console.log(out1);
  var out2 = tokenizer.encodeTrimSuffix(
    str,
    3,
    Array.from(specialTokens.keys())
  );
  console.log(out2);
  var out3 = tokenizer.encodeTrimPrefix(
    str,
    3,
    Array.from(specialTokens.keys())
  );
  console.log(out3);
};
createTokenizer();
