# Charts for BenchmarkDotNet

A simple web app that charts your [BenchmarkDotNet](https://benchmarkdotnet.org/) console results. The chart can then be copied to your clipboard or downloaded as a PNG image.

It currently understands standard results like the one shown below. Any columns between `Method` and `Mean` are considered categories in the chart across the x-axis. These columns are typically created via properties decorated with the `Params` attribute in your benchmark.


## How do I use it?
Just `copy` the output of your console containing the results and `paste` it in [the app](https://chartbenchmark.net/). The chart will be automatically generated.

Console Output Example:
```ini
BenchmarkDotNet=v0.13.2, OS=Windows 11 (10.0.22621.674)
AMD Ryzen 9 6900HS Creator Edition, 1 CPU, 16 logical and 8 physical cores
.NET SDK=6.0.401
    [Host]     : .NET 6.0.9 (6.0.922.41905), X64 RyuJIT AVX2
    Job-MLMWYV : .NET 6.0.9 (6.0.922.41905), X64 RyuJIT AVX2

Runtime=.NET 6.0  Server=True  InvocationCount=32
IterationCount=10  RunStrategy=Monitoring  WarmupCount=1

|          Method | NumberOfValues |        Mean |     Error |    StdDev |
|---------------- |--------------- |------------:|----------:|----------:|
|  Int32ValuesXml |             32 |  1,031.3 us | 112.23 us |  74.23 us |
| Int32ValuesJson |             32 |    683.1 us |  20.65 us |  13.66 us |
|  Int32ValuesXml |             64 |  1,289.4 us | 169.78 us | 112.30 us |
| Int32ValuesJson |             64 |    710.6 us |  33.60 us |  22.23 us |
|  Int32ValuesXml |            128 |  1,717.3 us | 130.11 us |  86.06 us |
| Int32ValuesJson |            128 |    705.6 us |  43.78 us |  28.96 us |
|  Int32ValuesXml |            256 |  2,619.3 us | 404.60 us | 267.62 us |
| Int32ValuesJson |            256 |    780.0 us |  28.38 us |  18.77 us |
|  Int32ValuesXml |            512 |  4,712.5 us | 137.08 us |  90.67 us |
| Int32ValuesJson |            512 |    919.8 us | 144.47 us |  95.56 us |
|  Int32ValuesXml |           1024 |  8,012.5 us | 214.29 us | 141.74 us |
| Int32ValuesJson |           1024 |  1,266.1 us | 120.41 us |  79.65 us |
|  Int32ValuesXml |           2048 | 14,420.2 us | 261.61 us | 173.04 us |
| Int32ValuesJson |           2048 |  1,673.8 us |  93.54 us |  61.87 us |
|  Int32ValuesXml |           4096 | 27,582.6 us | 249.89 us | 165.29 us |
| Int32ValuesJson |           4096 |  2,732.6 us | 259.02 us | 171.33 us |
```

> 💡 You can also paste the content of the `.md` file created after running your benchmarks. It's typically stored in the following project directory: `bin\Release\[Runtime]\BenchmarkDotNet.Artifacts\results`

There are a few controls above the chart that allows you customize the size, theme, and the y-axe scale. 

## Your Support is Appreciated!
If you feel that this solution has provided you some value, please consider [buying me a ☕][BuyMeACoffee].

[![Buy me a coffee][BuyMeACoffeeButton]][BuyMeACoffee]

Your ⭐ on [this repository][Repository] also helps! Thanks! 🖖🙂


[Repository]: https://github.com/yv989c/ChartsForBenchmarkDotNet
[BuyMeACoffee]: https://www.buymeacoffee.com/yv989c
[BuyMeACoffeeButton]: /images/bmc-48.svg
