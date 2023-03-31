using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.DeepDev.TokenizerLib.Utils;

namespace Microsoft.DeepDev
{
    /// <summary>
    /// This is a C# implementation of OpenAI's tiktoken implementation of
    /// BPE, the goal is to support gpt-3.5-turbo model tokenization.
    /// Reference: https://github.com/openai/tiktoken/blob/main/src/lib.rs
    /// </summary>
    public class TikTokenizer
    {

        private IReadOnlyDictionary<string, int> SpecialTokensEncoder = null!;
        private Regex Regex = null!;
        private IReadOnlyDictionary<byte[], int> Encoder = null!;
        private IReadOnlyDictionary<int, byte[]> Decoder = null!;
        private Regex SpecialTokensRegex = null!;
        private IReadOnlyDictionary<int, string> SpecialTokensDecoder = null!;

        /// <summary>
        ///     The default LRU cache size.
        /// </summary>
        public const int DefaultCacheSize = 4096;

        private readonly LruCache<string, int[]> Cache;

        public int NumOfCacheEntries => this.Cache.Count;

        /// <summary>
        /// Take the encoder tokens mapping from OpenAI tiktoken dump to build the encoder
        /// For gpt-3.5-turbo, you can download the BPE tokens mapping from:
        /// https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken
        /// </summary>
        /// <param name="encoder">Encoder mapping</param>
        /// <param name="specialTokensEncoder">Handle special tokens</param>
        /// <param name="pattern">Regex pattern to break a string to be encoded</param>
        public TikTokenizer(IReadOnlyDictionary<byte[], int> encoder, IReadOnlyDictionary<string, int> specialTokensEncoder, string pattern, int cacheSize = DefaultCacheSize)
        {
            Cache = new LruCache<string, int[]>(cacheSize);
            Init(encoder, specialTokensEncoder, pattern);
        }

        /// <summary>
        /// Overload of the constructor above to load encoder from a file stream
        /// </summary>
        /// <param name="tikTokenBpeFileStream">Encoder mapping file stream</param>
        /// <param name="specialTokensEncoder">Handle special tokens</param>
        /// <param name="pattern">Regex pattern to break a string to be encoded</param>
        public TikTokenizer(Stream tikTokenBpeFileStream, IReadOnlyDictionary<string, int> specialTokensEncoder, string pattern, int cacheSize = DefaultCacheSize)
        {
            Cache = new LruCache<string, int[]>(cacheSize);
            var encoder = LoadTikTokenBpe(tikTokenBpeFileStream);
            Init(encoder, specialTokensEncoder, pattern);
        }

        private void Init(IReadOnlyDictionary<byte[], int> encoder, IReadOnlyDictionary<string, int> specialTokensEncoder, string pattern)
        {
            Encoder = encoder;
            Regex = new Regex(pattern, RegexOptions.Compiled);
            SpecialTokensRegex = new Regex(string.Join("|", specialTokensEncoder.Keys.Select(s => Regex.Escape(s))), RegexOptions.Compiled);
            SpecialTokensEncoder = specialTokensEncoder;

            Decoder = Encoder.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

            if (Encoder.Count != Decoder.Count)
            {
                throw new ArgumentException("Encoder and decoder sizes don't match");
            }

            SpecialTokensDecoder = specialTokensEncoder.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

            var sortedTokenBytes = Encoder.Keys.ToList();
        }

        private Dictionary<byte[], int> LoadTikTokenBpe(Stream tikTokenBpeFileStream)
        {
            var bpeDict = new Dictionary<byte[], int>(new ByteArrayComparer());
            try
            {
                using (StreamReader reader = new StreamReader(tikTokenBpeFileStream))
                {
                    while (!reader.EndOfStream)
                    {
                        string line = reader.ReadLine();
                        if (string.IsNullOrWhiteSpace(line))
                        {
                            continue;
                        }

                        var tokens = line.Split(' ');
                        if (tokens.Length != 2)
                        {
                            throw new FormatException($"Invalid format in the BPE encoder file stream");
                        }

                        var tokenBytes = Convert.FromBase64String(tokens[0]);
                        int rank = 0;
                        if (int.TryParse(tokens[1], out rank))
                        {
                            bpeDict[tokenBytes] = rank;
                        }
                        else
                        {
                            throw new FormatException($"Can't parse {tokens[1]} to integer");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to load from BPE encoder file stream: {ex.Message}", ex);
            }

            return bpeDict;
        }

        /// <summary>
        /// Encode a piece of text
        /// </summary>
        /// <param name="text">Text to be encoded</param>
        /// <param name="allowedSpecial">A set of special tokens could appear in the text</param>
        /// <returns>List of token ids</returns>
        public List<int> Encode(string text, IReadOnlyCollection<string> allowedSpecial)
        {
            var tokenIds = new List<int>();
            int start = 0;
            while (true)
            {
                Match nextSpecial;
                int end;
                FindNextSpecialToken(text, allowedSpecial, start, out nextSpecial, out end);
                if (end > start)
                {
                    Encode(text, tokenIds, start, end);
                }

                if (nextSpecial.Success)
                {
                    start = EncodeSpecialToken(tokenIds, nextSpecial);
                    if (start >= text.Length)
                    {
                        break;
                    }
                }
                else
                {
                    break;
                }
            }

            return tokenIds;
        }

        private int EncodeSpecialToken(List<int> tokenIds, Match nextSpecial)
        {
            var token = SpecialTokensEncoder[nextSpecial.Value];
            tokenIds.Add(token);
            return nextSpecial.Index + nextSpecial.Length;
        }

        private void FindNextSpecialToken(string text, IReadOnlyCollection<string> allowedSpecial, int start, out Match nextSpecial, out int end)
        {
            int startFind = start;
            while (true)
            {
                nextSpecial = SpecialTokensRegex.Match(text, startFind);
                if (!nextSpecial.Success) break;
                if (allowedSpecial.Contains(text.Substring(nextSpecial.Index, nextSpecial.Length))) break;
                startFind = nextSpecial.Index + 1;
            }
            end = nextSpecial.Success ? nextSpecial.Index : text.Length;
        }

        private void Encode(string text, List<int> tokenIds, int start, int end)
        {
            foreach (Match match in Regex.Matches(text[start..end]))
            {
                if (this.Cache.Lookup(match.Value, out int[] tokens))
                {
                    tokenIds.AddRange(tokens);
                }
                else
                {
                    //cache miss
                    var bytes = Encoding.UTF8.GetBytes(match.Value);
                    if (Encoder.TryGetValue(bytes, out int token))
                    {
                        tokenIds.Add(token);
                    }
                    else
                    {
                        var encodedTokens = BytePairEncoder.BytePairEncode(bytes, Encoder);
                        tokenIds.AddRange(encodedTokens);
                        this.Cache.Add(match.Value, encodedTokens.ToArray());
                    }
                }
            }
        }

        private (int TokenCount, int EncodeLength) EncodeTrimSuffix(string text, List<int> tokenIds, int start, int end, int maxTokenCount, int tokenCount, int encodeLength)
        {
            foreach (Match match in Regex.Matches(text[start..end]))
            {
                var piece = match.Value;
                if (this.Cache.Lookup(piece, out int[] tokens))
                {
                    tokenCount += tokens.Length;
                    if (tokenCount <= maxTokenCount)
                    {
                        encodeLength += piece.Length;
                        tokenIds.AddRange(tokens);
                    }
                    else
                    {
                        break;
                    }
                }
                else
                {
                    //cache miss
                    var bytes = Encoding.UTF8.GetBytes(piece);
                    if (Encoder.TryGetValue(bytes, out int token))
                    {
                        tokenCount++;
                        if (tokenCount <= maxTokenCount)
                        {
                            encodeLength += piece.Length;
                            tokenIds.Add(token);
                        }
                        else
                        {
                            break;
                        }
                    }
                    else
                    {
                        var encodedTokens = BytePairEncoder.BytePairEncode(bytes, Encoder);
                        this.Cache.Add(piece, encodedTokens.ToArray());
                        tokenCount += encodedTokens.Count;
                        if (tokenCount <= maxTokenCount)
                        {
                            encodeLength += piece.Length;
                            tokenIds.AddRange(encodedTokens);
                        }
                        else
                        {
                            break;
                        }
                    }
                }
                if (tokenCount >= maxTokenCount) break;
            }
            return (tokenCount, encodeLength);
        }

        /// <summary>
        /// Encode a piece of text limited by max token count through trimming suffix
        /// </summary>
        /// <param name="text">Text to be encoded</param>
        /// <param name="allowedSpecial">A set of special tokens could appear in the text</param>
        /// <param name="maxTokenCount">The max token count</param>
        /// <returns>(List<int> TokenIds, string Text) - Token ids and text after suffix truncation based on max token count</returns>
        public (List<int> TokenIds, string Text) EncodeTrimSuffix(string text, IReadOnlyCollection<string> allowedSpecial, int maxTokenCount)
        {
            var tokenIds = new List<int>();

            int start = 0;
            int tokenCount = 0;
            var encodeLength = 0;
            while (true)
            {
                Match nextSpecial;
                int end;
                FindNextSpecialToken(text, allowedSpecial, start, out nextSpecial, out end);

                if (end > start)
                {
                    (tokenCount, encodeLength) = EncodeTrimSuffix(text, tokenIds, start, end, maxTokenCount, tokenCount, encodeLength);

                    if (tokenCount >= maxTokenCount)
                    {
                        break;
                    }
                }

                if (nextSpecial.Success)
                {
                    tokenCount++;
                    if (tokenCount <= maxTokenCount)
                    {
                        start = EncodeSpecialToken(tokenIds, nextSpecial);
                        encodeLength += nextSpecial.Value.Length;
                        if (start >= text.Length)
                        {
                            break;
                        }
                    }
                    if (tokenCount >= maxTokenCount)
                    {
                        break;
                    }
                }
                else
                {
                    break;
                }
            }

            var encodedText = encodeLength == text.Length ? text : text[..encodeLength];

            return (tokenIds, encodedText);
        }

        /// <summary>
        /// Encode a piece of text limited by max token count through trimming prefix
        /// </summary>
        /// <param name="text">Text to be encoded</param>
        /// <param name="allowedSpecial">A set of special tokens could appear in the text</param>
        /// <param name="maxTokenCount">The max token count</param>
        /// <returns>(List<int> TokenIds, string Text) - Token ids and text after prefix truncation based on max token count</returns>
        public (List<int> TokenIds, string Text) EncodeTrimPrefix(string text, IReadOnlyCollection<string> allowedSpecial, int maxTokenCount)
        {
            var tokenIds = new List<int>();

            int start = 0;
            int tokenCount = 0;
            var encodeLength = 0;
            var tokenCountMap = new SortedDictionary<int, int>();
            tokenCountMap.Add(tokenCount, encodeLength);
            while (true)
            {
                Match nextSpecial;
                int end;
                FindNextSpecialToken(text, allowedSpecial, start, out nextSpecial, out end);

                if (end > start)
                {
                    foreach (Match match in Regex.Matches(text[start..end]))
                    {
                        var piece = match.Value;

                        if (this.Cache.Lookup(match.Value, out int[] tokens))
                        {
                            tokenCount += tokens.Length;
                            encodeLength += piece.Length;
                            tokenIds.AddRange(tokens);
                            tokenCountMap[tokenCount] = encodeLength;
                        }
                        else
                        {
                            var bytes = Encoding.UTF8.GetBytes(piece);
                            if (Encoder.TryGetValue(bytes, out int token))
                            {
                                tokenCount++;
                                encodeLength += piece.Length;
                                tokenIds.Add(token);
                                tokenCountMap[tokenCount] = encodeLength;

                            }
                            else
                            {
                                var encodedTokens = BytePairEncoder.BytePairEncode(bytes, Encoder);
                                this.Cache.Add(piece, encodedTokens.ToArray());
                                tokenCount += encodedTokens.Count;
                                encodeLength += piece.Length;
                                tokenIds.AddRange(encodedTokens);
                                tokenCountMap[tokenCount] = encodeLength;
                            }
                        }
                    }
                }

                if (nextSpecial.Success)
                {
                    start = EncodeSpecialToken(tokenIds, nextSpecial);
                    tokenCount++;
                    encodeLength += nextSpecial.Value.Length;
                    tokenCountMap[tokenCount] = encodeLength;
                    if (start >= text.Length)
                    {
                        break;
                    }
                }
                else
                {
                    break;
                }
            }

            if (tokenCount <= maxTokenCount)
            {
                return (tokenIds, text);
            }

            var prefixTokenCount = tokenCount - maxTokenCount;
            var actualPrefixTokenCount = 0;
            var actualPrefixStrLength = 0;
            foreach (var pair in tokenCountMap)
            {
                if (pair.Key >= prefixTokenCount)
                {
                    actualPrefixTokenCount = pair.Key;
                    actualPrefixStrLength = pair.Value;
                    break;
                }
            }

            return (tokenIds.Skip(actualPrefixTokenCount).ToList(), text[actualPrefixStrLength..]);
        }

        /// <summary>
        /// Decode an array of integer token ids
        /// </summary>
        /// <param name="tokens">An array of integer token ids</param>
        /// <returns>Decoded text</returns>
        public string Decode(int[] tokens)
        {
            var decoded = new List<byte>(tokens.Length * 2);
            foreach (var token in tokens)
            {
                byte[] tokenBytes = { };
                if (Decoder.TryGetValue(token, out var value))
                {
                    tokenBytes = value;
                }
                else if (SpecialTokensDecoder.TryGetValue(token, out var specialTokenValue))
                {
                    tokenBytes = Encoding.UTF8.GetBytes(specialTokenValue);
                }
                decoded.AddRange(tokenBytes);
            }

            return Encoding.UTF8.GetString(decoded.ToArray());
        }
    }

}
