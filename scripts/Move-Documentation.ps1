# Move-Documentation.ps1
# Moves documentation files to organized folder structure

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

# Define documentation categories and their files
$docCategories = @{
    "features" = @(
        "JOB_CATEGORY_FEATURE.md",
        "SITE_LOCATION_FEATURE_COMPLETE.md",
        "AD_CONNECTION_STATUS_FEATURE.md",
        "EMAIL_FEATURE_SUMMARY.md",
        "MANUAL_MANAGER_EMAIL_FEATURE.md",
        "MFA_AND_USER_CREATION_FEATURES.md",
        "TERMINAL_VIEWER_FEATURE.md",
        "ADHELPER_ADVANCED_FEATURES.md"
    )
    "guides" = @(
        "GETTING_STARTED.md",
        "HOW_TO_RUN.md",
        "QUICK_START.md",
        "SITE_CONFIGURATION_GUIDE.md",
        "EMAIL_INTEGRATION_GUIDE.md",
        "STORED_CREDENTIALS_GUIDE.md",
        "DEPLOYMENT_CHECKLIST.md",
        "VOICE_COMMANDS_GUIDE.md"
    )
    "technical" = @(
        "CREDENTIAL_STORE_IMPLEMENTATION.md",
        "PARALLEL_PROCESSING_GUIDE.md",
        "STANDARD_GROUPS_REFERENCE.md"
    )
    "ui-ux" = @(
        "REHRIG_BRAND_UI_GUIDE.md",
        "REHRIG_BRAND_SUMMARY.md",
        "OFFICIAL_REHRIG_COLORS.md",
        "UI_MODERNIZATION_SUMMARY.md",
        "UI_MODERNIZATION_CODE_EXAMPLES.md",
        "UI_MODERNIZATION_QUICK_REFERENCE.md",
        "UI_UX_MODERNIZATION_PLAN.md",
        "BEFORE_AFTER_COMPARISON.md"
    )
    "status" = @(
        "DOCUMENTATION_AUDIT_REPORT.md",
        "APP_SUMMARY.md",
        "IMPLEMENTATION_SUMMARY.md",
        "IMPLEMENTATION_COMPLETE.md",
        "INTEGRATION_COMPLETE.md",
        "TASKS_COMPLETED_SUMMARY.md",
        "TRANSFORMATION_SUMMARY.md",
        "ADHELPER_COMBINED_STATUS.md",
        "CREDENTIAL_SYSTEM_STATUS.md",
        "VERIFICATION_REPORT.md",
        "ELECTRON_APP_TEST_REPORT.md",
        "BROWSER_TEST_SUMMARY.md"
    )
    "archive" = @(
        "ADHELPER_IMPROVEMENTS_BRAINSTORM.md"
    )
}

Write-Host "=== ADHelper Documentation Move Script ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be moved" -ForegroundColor Yellow
    Write-Host ""
}

$movedCount = 0
$skippedCount = 0

foreach ($category in $docCategories.Keys) {
    Write-Host "`nCategory: $category" -ForegroundColor Magenta
    
    $targetDir = Join-Path $PSScriptRoot "..\docs\$category"
    
    # Ensure target directory exists
    if (-not (Test-Path $targetDir)) {
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Write-Host "  [CREATED] Directory: docs/$category" -ForegroundColor Green
    }
    
    foreach ($file in $docCategories[$category]) {
        $sourcePath = Join-Path $PSScriptRoot "..\$file"
        $targetPath = Join-Path $targetDir $file
        
        if (Test-Path $sourcePath) {
            if (-not $DryRun) {
                Move-Item -Path $sourcePath -Destination $targetPath -Force
            }
            Write-Host "  [MOVED] $file -> docs/$category/" -ForegroundColor Green
            $movedCount++
        } else {
            Write-Host "  [SKIP] File not found: $file" -ForegroundColor Yellow
            $skippedCount++
        }
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Files moved: $movedCount" -ForegroundColor Green
Write-Host "Files skipped: $skippedCount" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "`n[DRY RUN COMPLETE] Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "`n[COMPLETE] Documentation files organized successfully!" -ForegroundColor Green
}

Write-Host "`nNext step: Create documentation index (INDEX.md)" -ForegroundColor Cyan

