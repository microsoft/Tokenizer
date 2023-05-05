import {
    createByModelName
  } from './src/tokenizerBuilder.js';
const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265],
]);

//const str = "This is a TopGame";
const str = "<|im_start|>Hello World<|im_end|>";
//const str = "!";
let tokenizer = null;
const createTokenizer = async () => {
    tokenizer = await createByModelName("gpt-3.5-turbo", specialTokens);
    //tokenizer = await createByModelName("gpt2");
    //var out = tokenizer.encode(str, Array.from(specialTokens.keys()));
    var out = tokenizer.encodeTrimSuffix(str, 5, Array.from(specialTokens.keys()));
    console.log(out);
}
createTokenizer();
