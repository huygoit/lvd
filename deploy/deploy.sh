#!/usr/bin/env bash
# Một lệnh trên VPS: sudo bash deploy/deploy.sh
#   tat-ca    cài máy rồi dựng app (mặc định)
#   may-chu   chỉ Node, PostgreSQL, Nginx, Certbot, SSH, tường lửa
#   ung-dung  chỉ kéo mã, .env, build, PM2
# Script SSH nằm riêng vì phải chạy trên máy cá nhân, không chạy trên VPS.

set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lenh="${1:-tat-ca}"

case "$lenh" in
  tat-ca)
    bash "$THU_MUC/02-may-chu.sh"
    bash "$THU_MUC/03-ung-dung.sh"
    ;;
  may-chu) bash "$THU_MUC/02-may-chu.sh" ;;
  ung-dung) bash "$THU_MUC/03-ung-dung.sh" ;;
  *)
    printf 'Dùng: sudo bash deploy/deploy.sh [tat-ca|may-chu|ung-dung]\n' >&2
    exit 1
    ;;
esac
