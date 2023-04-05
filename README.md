# Tokenizer

This repo contains a C# implementation of byte pair encoding(BPE) tokenizer for OpenAI LLMs, it's based on open sourced rust implementation in the [OpenAI tiktoken](https://github.com/openai/tiktoken). The library is valuable to run tokenization on prompt in .NET environment before feeding prompt into a LLM.

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
tokenizer = TokenizerBuilder.CreateByModelName("gpt-4", specialTokens);

var text = "<|im_start|>Hello World<|im_end|>";
var encoded = tokenizer.Encode(text, new HashSet<string>(specialTokens.Keys));
Console.WriteLine(encoded.Count);

var decoded = tokenizer.Decode(encoded.ToArray());
Console.WriteLine(decoded);
```

## Performance

PerfBenchmark result based on [PerfBenchmark.csproj](Tokenizer_C%23/PerfBenchmark/PerfBenchmark.csproj):
``` ini
BenchmarkDotNet=v0.13.3, OS=Windows 11 (10.0.22621.1413)
Intel Core i7-1065G7 CPU 1.30GHz, 1 CPU, 8 logical and 4 physical cores
.NET SDK=7.0.300-preview.23165.23
  [Host]     : .NET 6.0.15 (6.0.1523.11507), X64 RyuJIT AVX2
  DefaultJob : .NET 6.0.15 (6.0.1523.11507), X64 RyuJIT AVX2
```
| Method |    Mean |    Error |   StdDev |
|------- |--------:|---------:|---------:|
| Encode | 2.376 s | 0.0446 s | 0.0639 s |

## Contributing

We welcome contributions. Please follow [this guideline](CONTRIBUTING.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
