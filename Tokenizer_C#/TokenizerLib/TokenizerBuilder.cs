// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Net;
using System.Reflection;
using System.Net.Http;
using System.Threading.Tasks;

namespace Microsoft.DeepDev
{
    public static class TokenizerBuilder
    {

        private static readonly IReadOnlyDictionary<string, string> MODEL_PREFIX_TO_ENCODING =
                                                            new Dictionary<string, string>
                                                            {
                                                                // chat
                                                                { "gpt-4-", "cl100k_base" },  // e.g., gpt-4-0314, etc., plus gpt-4-32k
                                                                { "gpt-3.5-turbo-", "cl100k_base" } // e.g, gpt-3.5-turbo-0301, -0401, etc.
                                                            };
        private static readonly IReadOnlyDictionary<string, string> MODEL_TO_ENCODING =
                                                            new Dictionary<string, string>
                                                            {
                                                                // chat
                                                                { "gpt-4", "cl100k_base" },
                                                                { "gpt-3.5-turbo", "cl100k_base" },
                                                                // text
                                                                { "text-davinci-003", "p50k_base" },
                                                                { "text-davinci-002", "p50k_base" },
                                                                { "text-davinci-001", "r50k_base" },
                                                                { "text-curie-001", "r50k_base" },
                                                                { "text-babbage-001", "r50k_base" },
                                                                { "text-ada-001", "r50k_base" },
                                                                { "davinci", "r50k_base" },
                                                                { "curie", "r50k_base" },
                                                                { "babbage", "r50k_base" },
                                                                { "ada", "r50k_base" },
                                                                // code
                                                                { "code-davinci-002", "p50k_base" },
                                                                { "code-davinci-001", "p50k_base" },
                                                                { "code-cushman-002", "p50k_base" },
                                                                { "code-cushman-001", "p50k_base" },
                                                                { "davinci-codex", "p50k_base" },
                                                                { "cushman-codex", "p50k_base" },
                                                                // edit
                                                                { "text-davinci-edit-001", "p50k_edit" },
                                                                { "code-davinci-edit-001", "p50k_edit" },
                                                                // embeddings
                                                                { "text-embedding-ada-002", "cl100k_base" },
                                                                // old embeddings
                                                                { "text-similarity-davinci-001", "r50k_base" },
                                                                { "text-similarity-curie-001", "r50k_base" },
                                                                { "text-similarity-babbage-001", "r50k_base" },
                                                                { "text-similarity-ada-001", "r50k_base" },
                                                                { "text-search-davinci-doc-001", "r50k_base" },
                                                                { "text-search-curie-doc-001", "r50k_base" },
                                                                { "text-search-babbage-doc-001", "r50k_base" },
                                                                { "text-search-ada-doc-001", "r50k_base" },
                                                                { "code-search-babbage-code-001", "r50k_base" },
                                                                { "code-search-ada-code-001", "r50k_base" },
                                                                //open source
                                                                { "gpt2", "gpt2" }
                                                            };

        private const string ENDOFTEXT = "<|endoftext|>";
        private const string FIM_PREFIX = "<|fim_prefix|>";
        private const string FIM_MIDDLE = "<|fim_middle|>";
        private const string FIM_SUFFIX = "<|fim_suffix|>";
        private const string ENDOFPROMPT = "<|endofprompt|>";

        private static readonly HttpClient _httpClient = new HttpClient();

        /// <summary>
        /// Create tokenizer based on model name and extra special tokens
        /// </summary>
        /// <param name="modelName">Model name</param>
        /// <param name="extraSpecialTokens">Extra special tokens other than the built-in ones for the model</param>
        /// <returns>The tokenizer</returns>
        public static async Task<ITokenizer> CreateByModelNameAsync(string modelName, IReadOnlyDictionary<string, int>? extraSpecialTokens = null)
        {
            var encoder = "";
            if (!MODEL_TO_ENCODING.TryGetValue(modelName, out encoder))
            {
                foreach (var kvp in MODEL_PREFIX_TO_ENCODING)
                {
                    if (modelName.StartsWith(kvp.Key))
                    {
                        encoder = kvp.Value;
                        break;
                    }
                }
            }
            return await CreateByEncoderNameAsync(encoder, extraSpecialTokens);

        }

        /// <summary>
        /// Create tokenizer based on encoder name and extra special tokens
        /// </summary>
        /// <param name="encoderName">Encoder name</param>
        /// <param name="extraSpecialTokens">Extra special tokens other than the built-in ones for the encoder</param>
        /// <returns>The tokenizer</returns>
        /// <exception cref="NotImplementedException">Throws if the encoder is not supported</exception>
        public static async Task<ITokenizer> CreateByEncoderNameAsync(string encoderName, IReadOnlyDictionary<string, int>? extraSpecialTokens = null)
        {
            switch (encoderName)
            {
                case "cl100k_base":
                    var regexPatternStr = @"(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+";
                    var mergeableRanksFileUrl = @"https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken";
                    var specialTokens = new Dictionary<string, int>{
                                            { ENDOFTEXT, 100257},
                                            { FIM_PREFIX, 100258},
                                            { FIM_MIDDLE, 100259},
                                            { FIM_SUFFIX, 100260},
                                            { ENDOFPROMPT, 100276}
                                        };
                    if (!(extraSpecialTokens is null))
                    {
                        specialTokens = specialTokens.Concat(extraSpecialTokens)
                                            .ToDictionary(pair => pair.Key, pair => pair.Value);
                    }
                    return await CreateTokenizerAsync(regexPatternStr, mergeableRanksFileUrl, specialTokens);
                case "p50k_base":
                    regexPatternStr = @"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";
                    mergeableRanksFileUrl = @"https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken";
                    specialTokens = new Dictionary<string, int>{
                                            { ENDOFTEXT, 50256}
                                        };
                    if (!(extraSpecialTokens is null))
                    {
                        specialTokens = specialTokens.Concat(extraSpecialTokens)
                                            .ToDictionary(pair => pair.Key, pair => pair.Value);
                    }
                    return await CreateTokenizerAsync(regexPatternStr, mergeableRanksFileUrl, specialTokens);
                case "p50k_edit":
                    regexPatternStr = @"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";
                    mergeableRanksFileUrl = @"https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken";
                    specialTokens = new Dictionary<string, int>{
                                            { ENDOFTEXT, 50256 },
                                            { FIM_PREFIX, 50281 },
                                            { FIM_MIDDLE, 50282 },
                                            { FIM_SUFFIX, 50283 }
                                        };
                    if (!(extraSpecialTokens is null))
                    {
                        specialTokens = specialTokens.Concat(extraSpecialTokens)
                                            .ToDictionary(pair => pair.Key, pair => pair.Value);
                    }
                    return await CreateTokenizerAsync(regexPatternStr, mergeableRanksFileUrl, specialTokens);
                case "r50k_base":
                    regexPatternStr = @"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";
                    mergeableRanksFileUrl = @"https://openaipublic.blob.core.windows.net/encodings/r50k_base.tiktoken";
                    specialTokens = new Dictionary<string, int>{
                                            { ENDOFTEXT, 50256 },
                                        };
                    if (!(extraSpecialTokens is null))
                    {
                        specialTokens = specialTokens.Concat(extraSpecialTokens)
                                            .ToDictionary(pair => pair.Key, pair => pair.Value);
                    }
                    return await CreateTokenizerAsync(regexPatternStr, mergeableRanksFileUrl, specialTokens);
                case "gpt2":
                    regexPatternStr = @"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";
                    mergeableRanksFileUrl = @"https://github.com/microsoft/Tokenizer/blob/main/model/gpt2.tiktoken";
                    specialTokens = new Dictionary<string, int>{
                                            { ENDOFTEXT, 50256 },
                                        };
                    if (!(extraSpecialTokens is null))
                    {
                        specialTokens = specialTokens.Concat(extraSpecialTokens)
                                            .ToDictionary(pair => pair.Key, pair => pair.Value);
                    }
                    return await CreateTokenizerAsync(regexPatternStr, mergeableRanksFileUrl, specialTokens);
                default:
                    throw new NotImplementedException($"Doesn't support this encoder [{encoderName}]");

            }


        }

        /// <summary>
        /// Create tokenizer based on regex pattern, BPE rank file and special tokens
        /// </summary>
        /// <param name="regexPatternStr">Regex pattern to break a long string</param>
        /// <param name="mergeableRanksFileUrl">BPE rank file</param>
        /// <param name="specialTokens">Special tokens mapping</param>
        /// <returns>The tokenizer</returns>
        private static async Task<ITokenizer> CreateTokenizerAsync(string regexPatternStr, string mergeableRanksFileUrl, Dictionary<string, int> specialTokens)
        {
            using (Stream stream = await _httpClient.GetStreamAsync(mergeableRanksFileUrl))
            {
                return CreateTokenizer(stream, specialTokens, regexPatternStr);
            }
        }

        /// <summary>
        /// Create tokenizer based on BPE rank file stream, special tokens, regex pattern and cache size
        /// This is needed when user want to embed the BPE rank file in their assembly and pass in the stream.
        /// </summary>
        /// <param name="tikTokenBpeFileStream">File stream containing the BPE ranks</param>
        /// <param name="specialTokensEncoder">Special tokens mapping</param>
        /// <param name="pattern">Regex pattern to break a long string</param>
        /// <param name="cacheSize">LRU cache size to cache common tokens</param>
        /// <returns>The Tokenizer</returns>
        public static ITokenizer CreateTokenizer(Stream tikTokenBpeFileStream, IReadOnlyDictionary<string, int> specialTokensEncoder, string pattern, int cacheSize = 8192)
        {
            return new TikTokenizer(tikTokenBpeFileStream, specialTokensEncoder, pattern, cacheSize);
        }
    }

}
