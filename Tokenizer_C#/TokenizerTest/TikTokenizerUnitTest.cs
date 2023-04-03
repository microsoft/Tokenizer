// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
using Microsoft.DeepDev;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;


namespace TokenizerTest
{
    [TestClass]
    public class TikTokenizerUnitTest
    {
        private readonly ITokenizer Tokenizer;
        private readonly ITokenizer Tokenizer_gpt2;
        private readonly ITokenizer Tokenizer_p50k_base;
        private readonly ITokenizer Tokenizer_r50k_base;
        private readonly ITokenizer Tokenizer_p50k_edit;

        const string IM_START = "<|im_start|>";
        const string IM_END = "<|im_end|>";

        static readonly Dictionary<string, int> SpecialTokens = new Dictionary<string, int>{
                                                    { IM_START, 100264},
                                                    { IM_END, 100265},
                                                };

        public TikTokenizerUnitTest()
        {
            Tokenizer = TokenizerBuilder.CreateByModelName("gpt-4", SpecialTokens);
            Tokenizer_gpt2 = TokenizerBuilder.CreateByEncoderName("gpt2");
            Tokenizer_p50k_base = TokenizerBuilder.CreateByEncoderName("p50k_base");
            Tokenizer_r50k_base = TokenizerBuilder.CreateByEncoderName("r50k_base");
            Tokenizer_p50k_edit = TokenizerBuilder.CreateByEncoderName("p50k_edit");
        }

        [TestMethod]
        public void TestEncode0()
        {
            var text = "Hello World";
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(2, encoded.Count);
            Assert.AreEqual(9906, encoded[0]);
            Assert.AreEqual(4435, encoded[1]);
            var decoded = Tokenizer.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }


        [TestMethod]
        public void TestEncode1()
        {
            var text = "<|im_start|>Hello World<|im_end|>";
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(4, encoded.Count);
            Assert.AreEqual(100264, encoded[0]);
            Assert.AreEqual(9906, encoded[1]);
            Assert.AreEqual(4435, encoded[2]);
            Assert.AreEqual(100265, encoded[3]);
            var decoded = Tokenizer.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncode2()
        {
            var text = File.ReadAllText("./testData/lib.rs.txt");
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(5584, encoded.Count);

            string json = File.ReadAllText("./testData/tokens.json");
            var expected = JsonConvert.DeserializeObject<int[]>(json);

            for (int i = 0; i < encoded.Count; i++)
            {
                Assert.AreEqual(expected[i], encoded[i]);
            }
            Assert.AreEqual(expected.Length, encoded.Count);

            var decoded = Tokenizer.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncode3()
        {
            var text = "<|im_start|>Hello<|im_end|> World";
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(4, encoded.Count);
            Assert.AreEqual(100264, encoded[0]);
            Assert.AreEqual(9906, encoded[1]);
            Assert.AreEqual(100265, encoded[2]);
            Assert.AreEqual(4435, encoded[3]);
            var decoded = Tokenizer.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncode4()
        {
            var text = "";
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(0, encoded.Count);
        }


        [TestMethod]
        public void TestEncode5()
        {
            var text = "<|im_start|>Hello ⭐ World<|im_end|>";
            var encoded = Tokenizer.Encode(text, new HashSet<string>(SpecialTokens.Keys));
            Assert.AreEqual(6, encoded.Count);
            Assert.AreEqual(100264, encoded[0]);
            Assert.AreEqual(9906, encoded[1]);
            Assert.AreEqual(2928, encoded[2]);
            Assert.AreEqual(99834, encoded[3]);
            Assert.AreEqual(4435, encoded[4]);
            Assert.AreEqual(100265, encoded[5]);
            var decoded = Tokenizer.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncodeTrimSuffix()
        {
            var text = "<|im_start|>Hello World<|im_end|>";
            var encodedText = "<|im_start|>Hello World";
            var encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 4);
            Assert.AreEqual(4, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 5);
            Assert.AreEqual(4, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 3);
            Assert.AreEqual(3, encoded.TokenIds.Count);
            Assert.AreEqual(encodedText, encoded.Text);
            var decoded = Tokenizer.Decode(encoded.TokenIds.ToArray());
            Assert.AreEqual(encodedText, decoded);
        }

        [TestMethod]
        public void TestEncodeTrimSuffix2()
        {
            var text = "<|im_start|>Hello TempWorld<|im_end|>";
            var encodedText = "<|im_start|>Hello";
            var encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 5);
            Assert.AreEqual(5, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 6);
            Assert.AreEqual(5, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimSuffix(text, new HashSet<string>(SpecialTokens.Keys), 3);
            Assert.AreEqual(2, encoded.TokenIds.Count);
            Assert.AreEqual(encodedText, encoded.Text);
            var decoded = Tokenizer.Decode(encoded.TokenIds.ToArray());
            Assert.AreEqual(encodedText, decoded);
        }



        [TestMethod]
        public void TestEncodeTrimPrefix()
        {
            var text = "<|im_start|>Hello World<|im_end|>";
            var encodedText = "Hello World<|im_end|>";
            var encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 4);
            Assert.AreEqual(4, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 5);
            Assert.AreEqual(4, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 3);
            Assert.AreEqual(3, encoded.TokenIds.Count);
            Assert.AreEqual(encodedText, encoded.Text);
            var decoded = Tokenizer.Decode(encoded.TokenIds.ToArray());
            Assert.AreEqual(encodedText, decoded);
        }


        [TestMethod]
        public void TestEncodeTrimPrefix2()
        {
            var text = "<|im_start|>HelloTemp World<|im_end|>";
            var encodedText = " World<|im_end|>";
            var encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 5);
            Assert.AreEqual(5, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 6);
            Assert.AreEqual(5, encoded.TokenIds.Count);
            Assert.AreEqual(text, encoded.Text);

            encoded = Tokenizer.EncodeTrimPrefix(text, new HashSet<string>(SpecialTokens.Keys), 3);
            Assert.AreEqual(2, encoded.TokenIds.Count);
            Assert.AreEqual(encodedText, encoded.Text);
            var decoded = Tokenizer.Decode(encoded.TokenIds.ToArray());
            Assert.AreEqual(encodedText, decoded);
        }

        [TestMethod]
        public void TestEncodeGpt2()
        {
            var text = File.ReadAllText("./testData/lib.rs.txt");
            var encoded = Tokenizer_gpt2.Encode(text, new HashSet<string>());
            Assert.AreEqual(11378, encoded.Count);

            string json = File.ReadAllText("./testData/tokens_gpt2.json");
            var expected = JsonConvert.DeserializeObject<int[]>(json);

            for (int i = 0; i < encoded.Count; i++)
            {
                Assert.AreEqual(expected[i], encoded[i]);
            }
            Assert.AreEqual(expected.Length, encoded.Count);

            var decoded = Tokenizer_gpt2.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncodeP50kbase()
        {
            var text = File.ReadAllText("./testData/lib.rs.txt");
            var encoded = Tokenizer_p50k_base.Encode(text, new HashSet<string>());
            Assert.AreEqual(7230, encoded.Count);

            string json = File.ReadAllText("./testData/tokens_p50k_base.json");
            var expected = JsonConvert.DeserializeObject<int[]>(json);

            for (int i = 0; i < encoded.Count; i++)
            {
                Assert.AreEqual(expected[i], encoded[i]);
            }
            Assert.AreEqual(expected.Length, encoded.Count);

            var decoded = Tokenizer_p50k_base.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncodeP50kedit()
        {
            var text = File.ReadAllText("./testData/lib.rs.txt");
            var encoded = Tokenizer_p50k_edit.Encode(text, new HashSet<string>());
            Assert.AreEqual(7230, encoded.Count);

            string json = File.ReadAllText("./testData/tokens_p50k_edit.json");
            var expected = JsonConvert.DeserializeObject<int[]>(json);

            for (int i = 0; i < encoded.Count; i++)
            {
                Assert.AreEqual(expected[i], encoded[i]);
            }
            Assert.AreEqual(expected.Length, encoded.Count);

            var decoded = Tokenizer_p50k_edit.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

        [TestMethod]
        public void TestEncodeR50kbase()
        {
            var text = File.ReadAllText("./testData/lib.rs.txt");
            var encoded = Tokenizer_r50k_base.Encode(text, new HashSet<string>());
            Assert.AreEqual(11378, encoded.Count);

            string json = File.ReadAllText("./testData/tokens_r50k_base.json");
            var expected = JsonConvert.DeserializeObject<int[]>(json);

            for (int i = 0; i < encoded.Count; i++)
            {
                Assert.AreEqual(expected[i], encoded[i]);
            }
            Assert.AreEqual(expected.Length, encoded.Count);

            var decoded = Tokenizer_r50k_base.Decode(encoded.ToArray());
            Assert.AreEqual(text, decoded);
        }

    }
}
