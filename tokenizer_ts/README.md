# Tokenizer

This is a Typescript implementation of byte pair encoding(BPE) tokenizer for OpenAI LLMs, it's based on open sourced rust implementation in the [OpenAI tiktoken](https://github.com/openai/tiktoken). It's valuable to run prompt tokenization in Nodejs or web browser before feeding prompt into a LLM.


# How to use

The npm package `@microsoft/tiktokenizer` is published in [NPMJS Packages Registry](https://www.npmjs.com/package/@microsoft/tiktokenizer).
Install the npm package in your project:

```bash
npm install @microsoft/tiktokenizer
```

Example Typescript code to use @microsoft/tiktokenizer in your code:
```typescript
import {
    createByModelName
  } from '@microsoft/tiktokenizer';

const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";
const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265],
]);

const str = "<|im_start|>Hello World<|im_end|>";
let tokenizer = null;
const createTokenizer = async () => {
    tokenizer = await createByModelName("gpt-3.5-turbo", specialTokens);
    var out1 = tokenizer.encode(str, Array.from(specialTokens.keys()));
    console.log(out1);
    var out2 = tokenizer.encodeTrimSuffix(str, 3, Array.from(specialTokens.keys()));
    console.log(out2.tokenIds);
    console.log(out2.text);
    var out3 = tokenizer.encodeTrimPrefix(str, 3, Array.from(specialTokens.keys()));
    console.log(out3.tokenIds);
    console.log(out3.text);
}
createTokenizer();

```
In production setting, you should pre-download the BPE rank file and call `createTokenizer` API to avoid downloading the BPE rank file on the fly.
You can find the model to encoder and encoder to BPE rank file link mapping in: [tokenizerBuilder.ts](https://github.com/microsoft/Tokenizer/blob/main/tokenizer_ts/src/tokenizerBuilder.ts#L15-L55).

# Contributing

We welcome contributions. Please follow [this guideline](https://github.com/microsoft/Tokenizer/blob/main/CONTRIBUTING.md).

# Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
