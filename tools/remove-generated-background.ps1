param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Output,
  [int]$MinimumChannel = 218,
  [int]$MaximumSpread = 14
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (-not ("GeneratedBackgroundRemover" -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Private.Windows.GdiPlus,System.Private.Windows.Core,System.Collections -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class GeneratedBackgroundRemover {
  private static bool IsBackground(byte b, byte g, byte r, int minChannel, int maxSpread) {
    int min = Math.Min(r, Math.Min(g, b));
    int max = Math.Max(r, Math.Max(g, b));
    return min >= minChannel && max - min <= maxSpread;
  }

  public static void Remove(string input, string output, int minChannel, int maxSpread) {
    using (var source = new Bitmap(input))
    using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(bitmap)) graphics.DrawImageUnscaled(source, 0, 0);
      var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
      var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] pixels = new byte[stride * bitmap.Height];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      bool[] visited = new bool[bitmap.Width * bitmap.Height];
      var queue = new Queue<int>();

      Action<int,int> seed = (x, y) => {
        int id = y * bitmap.Width + x;
        if (visited[id]) return;
        int offset = y * stride + x * 4;
        if (!IsBackground(pixels[offset], pixels[offset + 1], pixels[offset + 2], minChannel, maxSpread)) return;
        visited[id] = true;
        queue.Enqueue(id);
      };

      for (int x = 0; x < bitmap.Width; x++) { seed(x, 0); seed(x, bitmap.Height - 1); }
      for (int y = 0; y < bitmap.Height; y++) { seed(0, y); seed(bitmap.Width - 1, y); }

      int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
      int[] dy = { -1, -1, -1, 0, 0, 1, 1, 1 };
      while (queue.Count > 0) {
        int id = queue.Dequeue();
        int x = id % bitmap.Width;
        int y = id / bitmap.Width;
        int offset = y * stride + x * 4;
        pixels[offset + 3] = 0;
        for (int i = 0; i < 8; i++) {
          int nx = x + dx[i], ny = y + dy[i];
          if (nx < 0 || ny < 0 || nx >= bitmap.Width || ny >= bitmap.Height) continue;
          int nid = ny * bitmap.Width + nx;
          if (visited[nid]) continue;
          int no = ny * stride + nx * 4;
          if (!IsBackground(pixels[no], pixels[no + 1], pixels[no + 2], minChannel, maxSpread)) continue;
          visited[nid] = true;
          queue.Enqueue(nid);
        }
      }

      Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
      bitmap.UnlockBits(data);
      bitmap.Save(output, ImageFormat.Png);
    }
  }
}
"@
}

$inputPath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputPath)
if (-not [System.IO.Directory]::Exists($outputDirectory)) {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

[GeneratedBackgroundRemover]::Remove($inputPath, $outputPath, $MinimumChannel, $MaximumSpread)
Write-Output "Removed connected generated background: $outputPath"
