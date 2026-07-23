param(
    [string]$Configuration = "Release",
    [string]$OutputPath = "publish"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:MSBUILDDISABLENODEREUSE = "1"
$env:DOTNET_CLI_USE_MSBUILD_SERVER = "0"

dotnet build-server shutdown
dotnet publish "TPV.Web\TPV.Web.csproj" -c $Configuration -o $OutputPath -p:UseSharedCompilation=false -p:NodeReuse=false
dotnet build-server shutdown
