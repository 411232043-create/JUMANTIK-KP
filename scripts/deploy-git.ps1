param(
  [string]$RemoteUrl = "",
  [string]$Branch = "main",
  [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git tidak ditemukan. Instal Git for Windows terlebih dahulu."
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
  git init
  if ($LASTEXITCODE -ne 0) { throw "Gagal menginisialisasi repository Git." }
}

if ($RemoteUrl) {
  git remote get-url origin *> $null
  if ($LASTEXITCODE -eq 0) {
    git remote set-url origin $RemoteUrl
  } else {
    git remote add origin $RemoteUrl
  }
  if ($LASTEXITCODE -ne 0) { throw "Gagal mengatur remote origin." }
}

if (-not $SkipCommit) {
  git add -A
  if ($LASTEXITCODE -ne 0) { throw "Gagal menambahkan perubahan ke staging." }
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m "Deploy Jumantik Online"
    if ($LASTEXITCODE -ne 0) { throw "Commit gagal. Pastikan identitas Git sudah dikonfigurasi." }
  }
}

git remote get-url origin *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Remote origin belum diatur. Jalankan dengan -RemoteUrl 'https://github.com/USER/REPO.git'."
}

git push -u origin $Branch
if ($LASTEXITCODE -ne 0) { throw "Push gagal. Periksa autentikasi, branch, dan akses repository." }
