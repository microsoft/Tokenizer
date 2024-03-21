# Tokenizer

This repo contains C# and Typescript implementation of byte pair encoding(BPE) tokenizer for OpenAI LLMs, it's based on open sourced rust implementation in the [OpenAI tiktoken](https://github.com/openai/tiktoken). Both implementation are valuable to run prompt tokenization in .NET and Nodejs environment before feeding prompt into a LLM.

# C# implementation

## Replace with Microsoft.ML.Tokenizers

The C# implementation is being replaced with [Microsoft.ML.Tokenizers](https://www.nuget.org/packages/Microsoft.ML.Tokenizers) from the .NET team.  Users of Microsoft.DeepDev.TokenizerLib should migrate to this new package which will be releaseed stable with .NET 9.0.  Instructions for migration can be found at https://github.com/dotnet/machinelearning/blob/main/docs/code/microsoft-ml-tokenizers-migration-guide.md.

## Microsoft.DeepDev.TokenizerLib

The TokenizerLib is built in .NET Standard 2.0, which can be consumed in projects on any version of .NET later than .NET Core 2.0 or .NET Framework 4.6.1.

You can download and install the nuget package of TokenizerLib [here](https://www.nuget.org/packages/Microsoft.DeepDev.TokenizerLib/).

Example C# code to use TokenizerLib in your code:
```csharp
using System.Collections.Generic;
using Microsoft.DeepDev;

var IM_START = "<|im_start|>";
var IM_END = "<|im_end|>";

var specialTokens = new Dictionary<string, int>{
                                            { IM_START, 100264},
                                            { IM_END, 100265},
                                        };
var tokenizer = await TokenizerBuilder.CreateByModelNameAsync("gpt-4", specialTokens);

var text = "<|im_start|>Hello World<|im_end|>";
var encoded = tokenizer.Encode(text, new HashSet<string>(specialTokens.Keys));
Console.WriteLine(encoded.Count);

var decoded = tokenizer.Decode(encoded.ToArray());
Console.WriteLine(decoded);
```
In production setting, you should pre-download the BPE rank file and call `TokenizerBuilder.CreateTokenizer` API to avoid downloading the BPE rank file on the fly.
You can find the model to encoder and encoder to BPE rank file link mapping in: [TokenizerBuilder.cs](https://github.com/microsoft/Tokenizer/blob/44cc0d603b22483abcc71310e25b8b3746f32cd9/Tokenizer_C%23/TokenizerLib/TokenizerBuilder.cs#L107).

## C# performance benchmark

PerfBenchmark result based on [PerfBenchmark.csproj](Tokenizer_C%23/PerfBenchmark/PerfBenchmark.csproj):
``` ini
BenchmarkDotNet=v0.13.3, OS=Windows 11 (10.0.22621.1702)
Intel Core i7-1065G7 CPU 1.30GHz, 1 CPU, 8 logical and 4 physical cores
.NET SDK=7.0.300-preview.23179.2
  [Host]     : .NET 6.0.16 (6.0.1623.17311), X64 RyuJIT AVX2
  DefaultJob : .NET 6.0.16 (6.0.1623.17311), X64 RyuJIT AVX2

| Method |    Mean |    Error |   StdDev |
|------- |--------:|---------:|---------:|
| Encode | 2.414 s | 0.0303 s | 0.0253 s |
```

# Typescript implementation

Please follow [README](tokenizer_ts/README.md).

# Contributing

We welcome contributions. Please follow [this guideline](CONTRIBUTING.md).

# Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
