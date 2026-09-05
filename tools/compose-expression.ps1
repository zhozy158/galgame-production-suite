param(
  [Parameter(Mandatory = $true)][string]$Base,
  [Parameter(Mandatory = $true)][string]$Edit,
  [Parameter(Mandatory = $true)][string]$Output,
  [string]$Regions = "500,245,135,65;500,327,60,35"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$basePath = (Resolve-Path -LiteralPath $Base).Path
$editPath = (Resolve-Path -LiteralPath $Edit).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputPath)
if (-not [System.IO.Directory]::Exists($outputDirectory)) {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

$baseImage = [System.Drawing.Bitmap]::FromFile($basePath)
$editImage = [System.Drawing.Bitmap]::FromFile($editPath)
try {
  if ($baseImage.Width -ne $editImage.Width -or $baseImage.Height -ne $editImage.Height) {
    throw "Base and edit dimensions differ: $($baseImage.Width)x$($baseImage.Height) vs $($editImage.Width)x$($editImage.Height)"
  }

  $rect = [System.Drawing.Rectangle]::new(0, 0, $baseImage.Width, $baseImage.Height)
  $result = $baseImage.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    foreach ($regionText in $Regions.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries)) {
      $values = @($regionText.Split(',') | ForEach-Object { [double]$_.Trim() })
      if ($values.Count -ne 4) { throw "Invalid region '$regionText'; expected centerX,centerY,radiusX,radiusY" }
      $cx, $cy, $rx, $ry = $values
      $left = [Math]::Max(0, [int][Math]::Floor($cx - $rx))
      $right = [Math]::Min($result.Width - 1, [int][Math]::Ceiling($cx + $rx))
      $top = [Math]::Max(0, [int][Math]::Floor($cy - $ry))
      $bottom = [Math]::Min($result.Height - 1, [int][Math]::Ceiling($cy + $ry))

      for ($y = $top; $y -le $bottom; $y++) {
        for ($x = $left; $x -le $right; $x++) {
          $distance = [Math]::Sqrt([Math]::Pow(($x - $cx) / $rx, 2) + [Math]::Pow(($y - $cy) / $ry, 2))
          if ($distance -ge 1) { continue }
          $weight = if ($distance -le 0.78) { 1.0 } else { (1.0 - $distance) / 0.22 }
          $basePixel = $result.GetPixel($x, $y)
          if ($basePixel.A -eq 0) { continue }
          $editPixel = $editImage.GetPixel($x, $y)
          $red = [int][Math]::Round($basePixel.R * (1 - $weight) + $editPixel.R * $weight)
          $green = [int][Math]::Round($basePixel.G * (1 - $weight) + $editPixel.G * $weight)
          $blue = [int][Math]::Round($basePixel.B * (1 - $weight) + $editPixel.B * $weight)
          $result.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($basePixel.A, $red, $green, $blue))
        }
      }
    }
    $result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $result.Dispose()
  }
} finally {
  $baseImage.Dispose()
  $editImage.Dispose()
}

Write-Output "Composed expression: $outputPath"
