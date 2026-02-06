# Test ADhelper.ps1 syntax
$scriptPath = "c:\GitHub\ADhelper\ADhelper.ps1"

Write-Host "Testing syntax of: $scriptPath" -ForegroundColor Cyan

$errors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)

if ($errors.Count -eq 0) {
    Write-Host "✅ Syntax OK - No errors found" -ForegroundColor Green
    Write-Host "   Total lines: $($ast.EndBlock.Extent.EndLineNumber)" -ForegroundColor Gray
} else {
    Write-Host "❌ Syntax Errors: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object {
        Write-Host "   Line $($_.Extent.StartLineNumber): $($_.Message)" -ForegroundColor Yellow
    }
}

