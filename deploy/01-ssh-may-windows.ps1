# Chạy trên Windows, trong thư mục gốc repo:
#   powershell -ExecutionPolicy Bypass -File deploy\01-ssh-may-windows.ps1
# Tạo khóa, đưa lên VPS. Thêm -CaDeploy để kéo mã và gọi deploy trên VPS.

param([switch]$CaDeploy)

$ErrorActionPreference = "Stop"
$thuMuc = Split-Path -Parent $MyInvocation.MyCommand.Path
$tep = Join-Path $thuMuc "deploy.properties"
if (-not (Test-Path $tep)) { throw "Thieu $tep" }

$cauHinh = @{}
Get-Content $tep | ForEach-Object {
  $dong = $_.Trim()
  if ($dong -eq "" -or $dong.StartsWith("#")) { return }
  $cat = $dong.IndexOf("=")
  if ($cat -lt 1) { return }
  $khoa = $dong.Substring(0, $cat).Trim()
  $gia = $dong.Substring($cat + 1).Trim().Trim('"')
  $cauHinh[$khoa] = $gia
}

$hostMay = $cauHinh["SSH_HOST"]
if (-not $hostMay) { throw "Dien SSH_HOST trong deploy/deploy.properties" }
$cong = if ($cauHinh["SSH_PORT"]) { $cauHinh["SSH_PORT"] } else { "22" }
$nguoi = if ($cauHinh["SSH_USER"]) { $cauHinh["SSH_USER"] } else { "root" }
$dich = "${nguoi}@${hostMay}"

$thuMucKhoa = Join-Path $env:USERPROFILE ".ssh"
$tepKhoa = Join-Path $thuMucKhoa "id_ed25519"
New-Item -ItemType Directory -Force -Path $thuMucKhoa | Out-Null
if (-not (Test-Path $tepKhoa)) {
  Write-Host "==> Tao khoa SSH"
  ssh-keygen -t ed25519 -f $tepKhoa -N "" -C "lienvietdoor"
}

Write-Host "==> Dua khoa len $dich (nhap mat khau VPS mot lan)"
$congKhai = (Get-Content "$tepKhoa.pub" -Raw).Trim()
ssh -p $cong -o StrictHostKeyChecking=accept-new $dich "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '$congKhai' ~/.ssh/authorized_keys || echo '$congKhai' >> ~/.ssh/authorized_keys"
ssh -p $cong $dich "echo SSH_OK"

if ($CaDeploy) {
  $app = $cauHinh["APP_DIR"]
  $repo = $cauHinh["GIT_REPO_URL"]
  $nhanh = if ($cauHinh["GIT_BRANCH"]) { $cauHinh["GIT_BRANCH"] } else { "main" }
  if (-not $app) { throw "Thieu APP_DIR" }
  Write-Host "==> Cai git va clone neu chua co ma"
  $lenh = @"
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git
if [ ! -f '$app/package.json' ]; then
  if [ -z '$repo' ]; then echo 'Chua co ma va chua co GIT_REPO_URL'; exit 1; fi
  mkdir -p "`$(dirname '$app')"
  git clone --branch '$nhanh' '$repo' '$app'
fi
"@
  $lenh | ssh -p $cong $dich "bash -s"
  scp -P $cong $tep "${dich}:${app}/deploy/deploy.properties"
  ssh -p $cong $dich "bash '$app/deploy/deploy.sh' tat-ca"
}

Write-Host "SSH xong. Tren VPS: sudo bash deploy/deploy.sh"
Write-Host "Hoac tu may nay: powershell -File deploy\01-ssh-may-windows.ps1 -CaDeploy"
