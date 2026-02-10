# Verify-Documentation.ps1
# Automated documentation verification script
# Checks for metadata, broken links, missing files, and outdated references

param(
    [string]$OutputFile = "",
    [switch]$Detailed = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== ADHelper Documentation Verification Script ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Initialize counters
$totalFiles = 0
$filesWithMetadata = 0
$filesWithoutMetadata = 0
$brokenLinks = @()
$missingFiles = @()
$warnings = @()

# Function to check if file has metadata
function Test-Metadata {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    
    $hasVersion = $content -match '\*\*Version:\*\*'
    $hasLastUpdated = $content -match '\*\*Last Updated:\*\*'
    $hasStatus = $content -match '\*\*Status:\*\*'
    
    return @{
        HasMetadata = ($hasVersion -and $hasLastUpdated -and $hasStatus)
        HasVersion = $hasVersion
        HasLastUpdated = $hasLastUpdated
        HasStatus = $hasStatus
    }
}

# Function to extract and verify links
function Test-Links {
    param([string]$FilePath, [string]$BaseDir)
    
    $content = Get-Content $FilePath -Raw
    $fileName = Split-Path $FilePath -Leaf
    $broken = @()
    
    # Match markdown links [text](path)
    $linkPattern = '\[([^\]]+)\]\(([^\)]+)\)'
    $matches = [regex]::Matches($content, $linkPattern)
    
    foreach ($match in $matches) {
        $linkPath = $match.Groups[2].Value
        
        # Skip external links (http/https)
        if ($linkPath -match '^https?://') {
            continue
        }
        
        # Skip anchors
        if ($linkPath -match '^#') {
            continue
        }
        
        # Resolve relative path
        $fileDir = Split-Path $FilePath -Parent
        $fullPath = Join-Path $fileDir $linkPath
        $fullPath = [System.IO.Path]::GetFullPath($fullPath)
        
        if (-not (Test-Path $fullPath)) {
            $broken += @{
                File = $fileName
                Link = $linkPath
                FullPath = $fullPath
            }
        }
    }
    
    return $broken
}

# Function to check for outdated line number references
function Test-LineNumbers {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $fileName = Split-Path $FilePath -Leaf
    $issues = @()
    
    # Check for line number references without disclaimer
    $hasLineNumbers = $content -match 'line[s]?\s+\d+' -or $content -match '\(lines?\s+\d+'
    $hasDisclaimer = $content -match 'Line numbers.*approximate' -or $content -match 'Note on Line Numbers'
    
    if ($hasLineNumbers -and -not $hasDisclaimer) {
        $issues += @{
            File = $fileName
            Issue = "Contains line number references without disclaimer"
        }
    }
    
    return $issues
}

# Scan documentation directories
$docsRoot = Join-Path $PSScriptRoot "..\docs"
$rootDir = Join-Path $PSScriptRoot ".."

Write-Host "Scanning documentation files..." -ForegroundColor Cyan

# Check if docs directory exists
if (Test-Path $docsRoot) {
    $docFiles = Get-ChildItem -Path $docsRoot -Filter "*.md" -Recurse
} else {
    Write-Host "[WARNING] docs/ directory not found. Scanning root directory..." -ForegroundColor Yellow
    $docFiles = Get-ChildItem -Path $rootDir -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }
}

foreach ($file in $docFiles) {
    $totalFiles++
    $relativePath = $file.FullName -replace [regex]::Escape($rootDir), ""
    
    Write-Host "`nChecking: $relativePath" -ForegroundColor Gray
    
    # Check metadata
    $metadataCheck = Test-Metadata -FilePath $file.FullName
    if ($metadataCheck.HasMetadata) {
        $filesWithMetadata++
        Write-Host "  [✓] Has metadata" -ForegroundColor Green
    } else {
        $filesWithoutMetadata++
        Write-Host "  [✗] Missing metadata" -ForegroundColor Red
        
        if (-not $metadataCheck.HasVersion) {
            Write-Host "    - Missing Version" -ForegroundColor Yellow
        }
        if (-not $metadataCheck.HasLastUpdated) {
            Write-Host "    - Missing Last Updated" -ForegroundColor Yellow
        }
        if (-not $metadataCheck.HasStatus) {
            Write-Host "    - Missing Status" -ForegroundColor Yellow
        }
    }
    
    # Check links
    $linkIssues = Test-Links -FilePath $file.FullName -BaseDir $rootDir
    if ($linkIssues.Count -gt 0) {
        $brokenLinks += $linkIssues
        Write-Host "  [✗] Found $($linkIssues.Count) broken link(s)" -ForegroundColor Red
        
        if ($Detailed) {
            foreach ($issue in $linkIssues) {
                Write-Host "    - $($issue.Link)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  [✓] All links valid" -ForegroundColor Green
    }
    
    # Check line number references
    $lineNumberIssues = Test-LineNumbers -FilePath $file.FullName
    if ($lineNumberIssues.Count -gt 0) {
        $warnings += $lineNumberIssues
        Write-Host "  [⚠] Line numbers without disclaimer" -ForegroundColor Yellow
    }
}

# Generate report
Write-Host "`n=== Verification Summary ===" -ForegroundColor Cyan
Write-Host "Total files scanned: $totalFiles" -ForegroundColor White
Write-Host "Files with metadata: $filesWithMetadata" -ForegroundColor Green
Write-Host "Files without metadata: $filesWithoutMetadata" -ForegroundColor $(if ($filesWithoutMetadata -gt 0) { "Red" } else { "Green" })
Write-Host "Broken links found: $($brokenLinks.Count)" -ForegroundColor $(if ($brokenLinks.Count -gt 0) { "Red" } else { "Green" })
Write-Host "Line number warnings: $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -gt 0) { "Yellow" } else { "Green" })

# Save detailed report if requested
if ($OutputFile) {
    $report = @"
# Documentation Verification Report
**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary
- Total files scanned: $totalFiles
- Files with metadata: $filesWithMetadata
- Files without metadata: $filesWithoutMetadata
- Broken links found: $($brokenLinks.Count)
- Line number warnings: $($warnings.Count)

## Files Without Metadata
"@

    if ($filesWithoutMetadata -gt 0) {
        foreach ($file in $docFiles) {
            $check = Test-Metadata -FilePath $file.FullName
            if (-not $check.HasMetadata) {
                $relativePath = $file.FullName -replace [regex]::Escape($rootDir), ""
                $report += "`n- $relativePath"
            }
        }
    } else {
        $report += "`n✓ All files have metadata"
    }

    $report += "`n`n## Broken Links`n"
    if ($brokenLinks.Count -gt 0) {
        foreach ($link in $brokenLinks) {
            $report += "`n- **$($link.File)**: $($link.Link)"
        }
    } else {
        $report += "`n✓ No broken links found"
    }

    $report += "`n`n## Line Number Warnings`n"
    if ($warnings.Count -gt 0) {
        foreach ($warning in $warnings) {
            $report += "`n- **$($warning.File)**: $($warning.Issue)"
        }
    } else {
        $report += "`n✓ No line number warnings"
    }

    Set-Content -Path $OutputFile -Value $report
    Write-Host "`n[SAVED] Detailed report: $OutputFile" -ForegroundColor Green
}

# Exit with appropriate code
if ($filesWithoutMetadata -gt 0 -or $brokenLinks.Count -gt 0) {
    Write-Host "`n[WARNING] Documentation has issues that need attention" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n[SUCCESS] All documentation checks passed!" -ForegroundColor Green
    exit 0
}

