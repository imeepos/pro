# Simplified Docker Build Script (PowerShell Version)
# Usage: .\scripts\build-image.ps1 [service]
# If no service specified, builds all services

param(
    [Parameter(Position=0)]
    [string]$Service = "all"
)

# Stop execution on error
$ErrorActionPreference = "Stop"

# Get git commit hash
$GitCommit = git rev-parse --short HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot get Git commit hash" -ForegroundColor Red
    exit 1
}

# Service configuration function
function Get-ServiceConfig {
    param([string]$ServiceName)

    switch ($ServiceName) {
        "api" {
            return "docker.io/imeepos/api:$GitCommit|apps/api/Dockerfile.playwright|."
        }
        "web" {
            return "docker.io/imeepos/web:$GitCommit|apps/web/Dockerfile|."
        }
        "admin" {
            return "docker.io/imeepos/admin:$GitCommit|apps/admin/Dockerfile|."
        }
        "broker" {
            return "docker.io/imeepos/broker:$GitCommit|apps/broker/Dockerfile|."
        }
        "crawler" {
            return "docker.io/imeepos/crawler:$GitCommit|apps/crawler/Dockerfile|."
        }
        "cleaner" {
            return "docker.io/imeepos/cleaner:$GitCommit|apps/cleaner/Dockerfile|."
        }
        default {
            return ""
        }
    }
}

# Get all services list
function Get-AllServices {
    return @("api", "web", "admin", "broker", "crawler", "cleaner")
}

# Check if old image exists as cache source
function Check-CacheSource {
    param([string]$ServiceName)

    $config = Get-ServiceConfig $ServiceName
    if ([string]::IsNullOrEmpty($config)) {
        return $null
    }

    $imageName = ($config -split '\|')[0]
    $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"

    # Remove docker.io/ prefix
    $shortImageName = $imageName -replace "^docker.io/", ""
    $shortLatestImageName = $latestImageName -replace "^docker.io/", ""

    Write-Host "Checking cache images..." -ForegroundColor Yellow
    Write-Host "Full name: $latestImageName" -ForegroundColor Gray
    Write-Host "Short name: $shortLatestImageName" -ForegroundColor Gray

    # Get local images list
    $images = docker images --format "{{.Repository}}:{{.Tag}}"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Cannot get Docker images list" -ForegroundColor Red
        return $null
    }

    # Check if latest tag image exists (try short name first)
    if ($images -contains $shortLatestImageName) {
        Write-Host "Found cache image: $shortLatestImageName" -ForegroundColor Green
        return $shortLatestImageName
    }

    # Try full name
    if ($images -contains $latestImageName) {
        Write-Host "Found cache image: $latestImageName" -ForegroundColor Green
        return $latestImageName
    }

    # Check if other versions exist
    $imageBase = $shortImageName.Substring(0, $shortImageName.LastIndexOf(':'))
    $matchingImages = $images | Where-Object { $_ -like "$imageBase`:*" }

    if ($matchingImages) {
        $latestTag = $matchingImages | Select-Object -First 1
        Write-Host "Found cache image: $latestTag" -ForegroundColor Green
        return $latestTag
    }

    Write-Host "No cache image found" -ForegroundColor Red
    return $null
}

# Build single service
function Build-Service {
    param([string]$ServiceName)

    $config = Get-ServiceConfig $ServiceName

    if ([string]::IsNullOrEmpty($config)) {
        Write-Host "ERROR: Unsupported service '$ServiceName'" -ForegroundColor Red
        Write-Host "Supported services: api, web, admin, broker, crawler, cleaner, all" -ForegroundColor Yellow
        exit 1
    }

    $imageName = ($config -split '\|')[0]
    $dockerfile = ($config -split '\|')[1]
    $buildContext = ($config -split '\|')[2]

    Write-Host "Building $ServiceName service..." -ForegroundColor Blue
    Write-Host "Image name: $imageName" -ForegroundColor Gray
    Write-Host "Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Host "Build context: $buildContext" -ForegroundColor Gray

    # Check if Dockerfile exists
    if (-not (Test-Path $dockerfile)) {
        Write-Host "ERROR: Dockerfile not found: $dockerfile" -ForegroundColor Red
        return $false
    }

    # Set cache parameters
    $buildFromBase = "node:20-alpine"
    $cacheArgs = @()

    # Check cache source
    $cacheSource = Check-CacheSource $ServiceName

    if ($cacheSource) {
        Write-Host "Using cache image: $cacheSource" -ForegroundColor Green
        $cacheArgs += @("--cache-from", $cacheSource)
        $buildFromBase = $cacheSource
    } else {
        Write-Host "Using base image: node:20-alpine" -ForegroundColor Yellow
    }

    # Build command parameters
    $buildArgs = @(
        "buildx", "build",
        "--platform", "linux/amd64",
        "-f", $dockerfile,
        "-t", $imageName,
        "--build-arg", "BUILD_FROM_BASE=$buildFromBase",
        "--cache-to", "type=inline,mode=max",
        $buildContext
    )

    # Execute build with progress display
    Write-Host "Starting Docker build process..." -ForegroundColor Yellow
    Write-Host "This will show real-time Docker output and may take several minutes." -ForegroundColor Gray
    Write-Host "Build command: docker $($buildArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tip: Press Ctrl+C to cancel the build if needed" -ForegroundColor Cyan
    Write-Host ""

    # Record start time
    $startTime = Get-Date

    # Execute docker build directly - this will show real-time output
    try {
        docker $buildArgs
        $endTime = Get-Date
        $duration = $endTime - $startTime

        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "Build time: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Gray
            return $false
        } else {
            Write-Host ""
            Write-Host "Build completed successfully!" -ForegroundColor Green
            Write-Host "Build time: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host ""
        Write-Host "Build interrupted or failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }

    # Add latest tag
    $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"
    docker tag $imageName $latestImageName

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Tag addition failed" -ForegroundColor Red
        return $false
    }

    Write-Host "$ServiceName service build completed!" -ForegroundColor Green
    Write-Host "Tags: $imageName, $latestImageName" -ForegroundColor Gray
    Write-Host ""

    return $true
}

# Main logic
if ($Service -eq "all") {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Building all services Docker images" -ForegroundColor Cyan
    Write-Host "Git Commit: $GitCommit" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # Build all services
    $services = Get-AllServices
    $successCount = 0

    foreach ($serviceName in $services) {
        if (Build-Service $serviceName) {
            $successCount++
        }
    }

    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "All services build completed! Success: $successCount/$($services.Count)" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Available images:" -ForegroundColor Yellow

    foreach ($serviceName in $services) {
        $config = Get-ServiceConfig $serviceName
        $imageName = ($config -split '\|')[0]
        $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"
        Write-Host "   - $imageName" -ForegroundColor Gray
        Write-Host "   - $latestImageName" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Building Docker image" -ForegroundColor Cyan
    Write-Host "Git Commit: $GitCommit" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # Build specified service
    if (Build-Service $Service) {
        $config = Get-ServiceConfig $Service
        $imageName = ($config -split '\|')[0]
        $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"

        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host "Build completed!" -ForegroundColor Cyan
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host "Available images:" -ForegroundColor Yellow
        Write-Host "   - $imageName" -ForegroundColor Gray
        Write-Host "   - $latestImageName" -ForegroundColor Gray
        Write-Host ""

        Write-Host "Run examples:" -ForegroundColor Yellow
        Write-Host "   Using commit hash: docker run -p 3000:3000 $imageName" -ForegroundColor Gray
        Write-Host "   Using latest tag: docker run -p 3000:3000 $latestImageName" -ForegroundColor Gray
    } else {
        Write-Host "Build failed" -ForegroundColor Red
        exit 1
    }
}