# 简化的Docker构建脚本 (PowerShell版本)
# 使用方法: .\scripts\build-image.ps1 [service]
# 如果不指定服务，则构建所有服务

param(
    [Parameter(Position=0)]
    [string]$Service = "all"
)

# 错误时停止执行
$ErrorActionPreference = "Stop"

# 获取git commit hash
$GitCommit = git rev-parse --short HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: 无法获取Git commit hash" -ForegroundColor Red
    exit 1
}

# 服务配置函数
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

# 获取所有服务列表
function Get-AllServices {
    return @("api", "web", "admin", "broker", "crawler", "cleaner")
}

# 检查是否存在旧镜像作为缓存源
function Check-CacheSource {
    param([string]$ServiceName)

    $config = Get-ServiceConfig $ServiceName
    if ([string]::IsNullOrEmpty($config)) {
        return $null
    }

    $imageName = ($config -split '\|')[0]
    $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"

    # 去除 docker.io/ 前缀
    $shortImageName = $imageName -replace "^docker.io/", ""
    $shortLatestImageName = $latestImageName -replace "^docker.io/", ""

    Write-Host "🔍 检查缓存镜像..." -ForegroundColor Yellow
    Write-Host "📋 完整名称: $latestImageName" -ForegroundColor Gray
    Write-Host "📋 短名称: $shortLatestImageName" -ForegroundColor Gray

    # 获取本地镜像列表
    $images = docker images --format "{{.Repository}}:{{.Tag}}"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 无法获取Docker镜像列表" -ForegroundColor Red
        return $null
    }

    # 检查是否存在 latest 标签的镜像（先尝试短名称）
    if ($images -contains $shortLatestImageName) {
        Write-Host "🎯 发现缓存镜像: $shortLatestImageName" -ForegroundColor Green
        return $shortLatestImageName
    }

    # 再尝试完整名称
    if ($images -contains $latestImageName) {
        Write-Host "🎯 发现缓存镜像: $latestImageName" -ForegroundColor Green
        return $latestImageName
    }

    # 检查是否存在其他版本的镜像
    $imageBase = $shortImageName.Substring(0, $shortImageName.LastIndexOf(':'))
    $matchingImages = $images | Where-Object { $_ -like "$imageBase`:*" }

    if ($matchingImages) {
        $latestTag = $matchingImages | Select-Object -First 1
        Write-Host "🎯 发现缓存镜像: $latestTag" -ForegroundColor Green
        return $latestTag
    }

    Write-Host "❌ 未找到缓存镜像" -ForegroundColor Red
    return $null
}

# 构建单个服务
function Build-Service {
    param([string]$ServiceName)

    $config = Get-ServiceConfig $ServiceName

    if ([string]::IsNullOrEmpty($config)) {
        Write-Host "❌ 错误: 不支持的服务 '$ServiceName'" -ForegroundColor Red
        Write-Host "支持的服务: api, web, admin, broker, crawler, cleaner, all" -ForegroundColor Yellow
        exit 1
    }

    $imageName = ($config -split '\|')[0]
    $dockerfile = ($config -split '\|')[1]
    $buildContext = ($config -split '\|')[2]

    Write-Host "🚀 开始构建 $ServiceName 服务..." -ForegroundColor Blue
    Write-Host "📦 镜像名称: $imageName" -ForegroundColor Gray
    Write-Host "📄 Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Host "📁 构建上下文: $buildContext" -ForegroundColor Gray

    # 检查Dockerfile是否存在
    if (-not (Test-Path $dockerfile)) {
        Write-Host "❌ 错误: Dockerfile不存在: $dockerfile" -ForegroundColor Red
        return $false
    }

    # 设置缓存参数
    $buildFromBase = "node:20-alpine"
    $cacheArgs = @()

    # 检查缓存源
    $cacheSource = Check-CacheSource $ServiceName

    if ($cacheSource) {
        Write-Host "🚀 使用缓存镜像: $cacheSource" -ForegroundColor Green
        $cacheArgs += @("--cache-from", $cacheSource)
        $buildFromBase = $cacheSource
    } else {
        Write-Host "🔧 使用基础镜像: node:20-alpine" -ForegroundColor Yellow
    }

    # 构建命令参数
    $buildArgs = @(
        "buildx", "build",
        "--platform", "linux/amd64",
        "-f", $dockerfile,
        "-t", $imageName,
        "--build-arg", "BUILD_FROM_BASE=$buildFromBase",
        "--cache-to", "type=inline,mode=max",
        $buildContext
    )

    # 执行构建
    Write-Host "执行: docker $($buildArgs -join ' ')" -ForegroundColor Gray
    docker $buildArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 构建失败" -ForegroundColor Red
        return $false
    }

    # 添加 latest 标签
    $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"
    docker tag $imageName $latestImageName

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 标签添加失败" -ForegroundColor Red
        return $false
    }

    Write-Host "✅ $ServiceName 服务构建完成！" -ForegroundColor Green
    Write-Host "📦 标签: $imageName, $latestImageName" -ForegroundColor Gray
    Write-Host ""

    return $true
}

# 主逻辑
if ($Service -eq "all") {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🚀 开始构建所有服务 Docker 镜像" -ForegroundColor Cyan
    Write-Host "🔖 Git Commit: $GitCommit" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""

    # 构建所有服务
    $services = Get-AllServices
    $successCount = 0

    foreach ($serviceName in $services) {
        if (Build-Service $serviceName) {
            $successCount++
        }
    }

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🎉 所有服务构建完成！成功: $successCount/$($services.Count)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📋 可用镜像:" -ForegroundColor Yellow

    foreach ($serviceName in $services) {
        $config = Get-ServiceConfig $serviceName
        $imageName = ($config -split '\|')[0]
        $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"
        Write-Host "   - $imageName" -ForegroundColor Gray
        Write-Host "   - $latestImageName" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🚀 开始构建 Docker 镜像" -ForegroundColor Cyan
    Write-Host "🔖 Git Commit: $GitCommit" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""

    # 构建指定服务
    if (Build-Service $Service) {
        $config = Get-ServiceConfig $Service
        $imageName = ($config -split '\|')[0]
        $latestImageName = "$($imageName.Substring(0, $imageName.LastIndexOf(':'))):latest"

        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🎉 构建完成！" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "📋 可用镜像:" -ForegroundColor Yellow
        Write-Host "   - $imageName" -ForegroundColor Gray
        Write-Host "   - $latestImageName" -ForegroundColor Gray
        Write-Host ""

        Write-Host "🏃 运行示例:" -ForegroundColor Yellow
        Write-Host "   使用 commit hash: docker run -p 3000:3000 $imageName" -ForegroundColor Gray
        Write-Host "   使用 latest 标签: docker run -p 3000:3000 $latestImageName" -ForegroundColor Gray
    } else {
        Write-Host "❌ 构建失败" -ForegroundColor Red
        exit 1
    }
}