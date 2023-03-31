// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
using System.Collections.Generic;

namespace Microsoft.DeepDev
{
    public interface ITokenizer
    {
        /// <summary>
        /// Encode a string with a set of allowed special tokens that are not broken apart.
        /// </summary>
        public List<int> Encode(string text, IReadOnlyCollection<string> allowedSpecial);

        /// <summary>
        /// Encode a piece of text limited by max token count through trimming suffix
        /// </summary>
        public (List<int> TokenIds, string Text) EncodeTrimSuffix(string text, IReadOnlyCollection<string> allowedSpecial, int maxTokenCount);


        /// <summary>
        /// Encode a piece of text limited by max token count through trimming prefix
        /// </summary>
        public (List<int> TokenIds, string Text) EncodeTrimPrefix(string text, IReadOnlyCollection<string> allowedSpecial, int maxTokenCount);


        /// <summary>
        /// Decode an array of integer token ids
        /// </summary>
        public string Decode(int[] tokens);
    }
}
