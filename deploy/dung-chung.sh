#!/usr/bin/env bash
# Hàm dùng chung. Không chạy trực tiếp.

set -euo pipefail

THU_MUC_DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\n==> %s\n' "$*"; }
loi() { printf 'Lỗi: %s\n' "$*" >&2; exit 1; }

tai_cau_hinh() {
  local tep="${1:-$THU_MUC_DEPLOY/deploy.properties}"
  [[ -f "$tep" ]] || loi "Thiếu file $tep"
  set -a
  # shellcheck disable=SC1090
  source "$tep"
  set +a
  [[ -n "${NODE_MAJOR:-}" ]] || loi "Thiếu NODE_MAJOR"
  [[ -n "${POSTGRES_VERSION:-}" ]] || loi "Thiếu POSTGRES_VERSION"
  [[ -n "${APP_DIR:-}" ]] || loi "Thiếu APP_DIR"
  [[ -n "${APP_PORT:-}" ]] || loi "Thiếu APP_PORT"
  [[ -n "${PM2_NAME:-}" ]] || loi "Thiếu PM2_NAME"
  [[ -n "${DB_NAME:-}" ]] || loi "Thiếu DB_NAME"
  [[ -n "${DB_USER:-}" ]] || loi "Thiếu DB_USER"
  [[ -n "${DOMAIN:-}" ]] || loi "Thiếu DOMAIN"
  [[ "$DB_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]] || loi "DB_NAME chỉ gồm chữ, số, gạch dưới"
  [[ "$DB_USER" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]] || loi "DB_USER chỉ gồm chữ, số, gạch dưới"
  if [[ -n "${DB_PASSWORD:-}" && ! "$DB_PASSWORD" =~ ^[A-Za-z0-9]+$ ]]; then
    loi "DB_PASSWORD chỉ gồm chữ và số, hoặc để trống để script tự sinh"
  fi
}

yeu_cau_root() {
  [[ "$(id -u)" -eq 0 ]] || loi "Chạy bằng root: sudo bash deploy/deploy.sh"
}

# Lấy giá trị một khóa trong file .env hiện có. Không có thì in rỗng.
gia_tri_env() {
  local khoa="$1" tep="$2" dong
  [[ -f "$tep" ]] || return 0
  dong="$(grep -E "^${khoa}=" "$tep" | tail -n 1 || true)"
  dong="${dong#*=}"
  dong="${dong%\"}"
  dong="${dong#\"}"
  printf '%s' "$dong"
}
