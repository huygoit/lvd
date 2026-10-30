#!/usr/bin/env bash
# Chạy trên máy Ubuntu của bạn, trước khi vào VPS.
# Tạo khóa, đưa khóa lên máy chủ, rồi (nếu đã có mã trên VPS) gọi deploy từ xa.
# Usage: bash deploy/01-ssh-may-local.sh

set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$THU_MUC/dung-chung.sh"
tai_cau_hinh "$THU_MUC/deploy.properties"

[[ -n "${SSH_HOST:-}" ]] || loi "Điền SSH_HOST trong deploy/deploy.properties"
lenh_ssh=(ssh -p "${SSH_PORT:-22}" -o StrictHostKeyChecking=accept-new "${SSH_USER:-root}@${SSH_HOST}")

thu_muc_khoa="${HOME}/.ssh"
tep_khoa="${thu_muc_khoa}/id_ed25519"
mkdir -p "$thu_muc_khoa"
chmod 700 "$thu_muc_khoa"
if [[ ! -f "$tep_khoa" ]]; then
  log "Tạo khóa SSH"
  ssh-keygen -t ed25519 -f "$tep_khoa" -N "" -C "lienvietdoor"
fi

log "Đưa khóa lên ${SSH_USER:-root}@${SSH_HOST} (nhập mật khẩu VPS một lần)"
ssh-copy-id -i "${tep_khoa}.pub" -p "${SSH_PORT:-22}" "${SSH_USER:-root}@${SSH_HOST}"

log "Kiểm tra đăng nhập bằng khóa"
"${lenh_ssh[@]}" "echo SSH_OK"

if [[ "${1:-}" == "--ca-deploy" ]]; then
  [[ -n "${GIT_REPO_URL:-}" || -n "${APP_DIR:-}" ]] || loi "Thiếu GIT_REPO_URL"
  log "Cài git trên VPS nếu chưa có, rồi chạy deploy"
  "${lenh_ssh[@]}" "bash -s" <<EOF
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git
if [[ ! -f "${APP_DIR}/package.json" ]]; then
  [[ -n "${GIT_REPO_URL}" ]] || { echo "Chưa có mã và chưa có GIT_REPO_URL"; exit 1; }
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${GIT_BRANCH:-main}" "${GIT_REPO_URL}" "${APP_DIR}"
fi
EOF
  scp -P "${SSH_PORT:-22}" "$THU_MUC/deploy.properties" "${SSH_USER:-root}@${SSH_HOST}:${APP_DIR}/deploy/deploy.properties"
  "${lenh_ssh[@]}" "bash ${APP_DIR}/deploy/deploy.sh tat-ca"
fi

echo "SSH xong. Trên VPS: sudo bash deploy/deploy.sh"
echo "Hoặc từ máy này, khi mã đã ở trên git: bash deploy/01-ssh-may-local.sh --ca-deploy"
