using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Microsoft.DeepDev
{
    internal class Program
    {
        /// <summary>
        /// This is a console app using the TokenizerLib to perform encoding of a string
        /// Example usage: Tokenizer.exe "gpt-3.5-turbo" "hello, world"
        /// </summary>
        /// <param name="args">args[0] -- model name, args[1] -- string to be encoded</param>
        static async Task Main(string[] args)
        {
            try
            {
                var tokenizer = await TokenizerBuilder.CreateByModelNameAsync(args[0]);
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
