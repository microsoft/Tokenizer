using System;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.DeepDev;

namespace PerfBenchmark
{
    public class Tokenization
    {
        private List<String> Words;
        private readonly string data;
        private ITokenizer Tokenizer;

        public Tokenization()
        {
            Words = new List<string>();
            using (StreamReader sr = new StreamReader("data/words.txt"))
            {
                // Read the file line by line and display each line.
                string? line;
                while (!((line = sr.ReadLine()) is null))
                {
                    Words.Add(line);
                }
            }
            var rnd = new Random();
            var result = Words.OrderBy(item => rnd.Next());
            data = string.Join(" ", result);
        }

        [Benchmark]
        public List<int> Encode() => Tokenizer.Encode(data, new HashSet<string>());

        [GlobalSetup]
        public async Task GlobalSetup()
        {
            this.Tokenizer = await TokenizerBuilder.CreateByModelNameAsync("gpt-4");
        }
    }

    public class Program
    {
        public static void Main(string[] args)
        {
            var summary = BenchmarkRunner.Run(typeof(Program).Assembly);
        }
    }
}
