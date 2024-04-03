# Tokenizer

This repo contains C# and Typescript implementation of byte pair encoding(BPE) tokenizer for OpenAI LLMs, it's based on open sourced rust implementation in the [OpenAI tiktoken](https://github.com/openai/tiktoken). Both implementation are valuable to run prompt tokenization in .NET and Nodejs environment before feeding prompt into a LLM.

## C# implementation

   > [!IMPORTANT]
   > Users of `Microsoft.DeepDev.TokenizerLib` should migrate to `Microsoft.ML.Tokenizers`. The functionality in `Microsoft.DeepDev.TokenizerLib` has been added to [`Microsoft.ML.Tokenizers`](https://www.nuget.org/packages/Microsoft.ML.Tokenizers). `Microsoft.ML.Tokenizers` is a tokenizer library being developed by the .NET team and going forward, the central place for tokenizer development in .NET. By using `Microsoft.ML.Tokenizers`, you should see improved performance over existing tokenizer library implementations, including `Microsoft.DeepDev.TokenizerLib`. A stable release of `Microsoft.ML.Tokenizers` is expected alongside the .NET 9.0 release (November 2024). Instructions for migration can be found at https://github.com/dotnet/machinelearning/blob/main/docs/code/microsoft-ml-tokenizers-migration-guide.md.

## Typescript implementation

Please follow [README](tokenizer_ts/README.md).

## Contributing

We welcome contributions. Please follow [this guideline](CONTRIBUTING.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
