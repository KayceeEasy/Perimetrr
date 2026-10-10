# Deterministic typography assets; no external image service or tracking.
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskCanvas = New-Object System.Drawing.Bitmap 1200,630
$taskGraphics = [System.Drawing.Graphics]::FromImage($taskCanvas)
$taskGraphics.SmoothingMode = 'AntiAlias'
$taskGraphics.TextRenderingHint = 'AntiAliasGridFit'
$taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0F1B2D'))
$taskGreen = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#27FB8A'))
$taskWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#F5F7FB'))
$taskMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#B8C4D7'))
$taskTitle = New-Object System.Drawing.Font 'Segoe UI',62,([System.Drawing.FontStyle]::Bold)
$taskSubtitle = New-Object System.Drawing.Font 'Segoe UI',32
$taskSmall = New-Object System.Drawing.Font 'Segoe UI',22
$taskGraphics.FillRectangle($taskGreen,72,76,8,70)
$taskGraphics.DrawString('Perimetrr',$taskTitle,$taskWhite,98,62)
$taskGraphics.DrawString('Presence you can prove.',$taskSubtitle,$taskGreen,72,300)
$taskGraphics.DrawString('Workspace attendance. Device pairing. Hybrid schedules.',$taskSmall,$taskMuted,72,390)
$taskCanvas.Save((Join-Path $taskRoot 'image/social-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$taskGraphics.Dispose(); $taskCanvas.Dispose()
$taskIcon = New-Object System.Drawing.Bitmap 180,180
$taskGraphics = [System.Drawing.Graphics]::FromImage($taskIcon)
$taskGraphics.SmoothingMode = 'AntiAlias'
$taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0F1B2D'))
$taskPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#27FB8A')),10
$taskGraphics.DrawEllipse($taskPen,35,35,110,110)
$taskGraphics.FillEllipse($taskGreen,72,72,36,36)
$taskIcon.Save((Join-Path $taskRoot 'image/apple-touch-icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$taskGraphics.Dispose(); $taskIcon.Dispose(); $taskPen.Dispose()
$taskGreen.Dispose(); $taskWhite.Dispose(); $taskMuted.Dispose()
$taskTitle.Dispose(); $taskSubtitle.Dispose(); $taskSmall.Dispose()
