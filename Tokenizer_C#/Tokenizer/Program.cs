using System;
using System.Collections.Generic;

namespace Microsoft.DeepDev
{
    internal class Program
    {
        static void Main(string[] args)
        {
            try
            {
                var tokenizer = TokenizerBuilder.CreateByModelName(args[0]);
                Console.WriteLine($"Tokenizing: [{args[1]}]");
                var encoded = tokenizer.Encode(args[1], new List<string>());
                for (var i = 0; i < encoded.Count; i++)
                {
                    var token = tokenizer.Decode(new int[] { encoded[i] });
                    Console.WriteLine($"{token}, {encoded[i]}");
                }
                var decoded = tokenizer.Decode(encoded.ToArray());
                Console.WriteLine($"Decoded: [{decoded}]");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Example usage: Tokenizer.exe \"gpt-3.5-turbo\" \"hello, world\"");
                Console.WriteLine($"Error running tokenizer:\n {ex.ToString()}");
            }
        }
    }
}
