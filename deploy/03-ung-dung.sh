#!/usr/bin/env bash
# Lấy mã, ghi .env, tạo database, build, chạy PM2.
# Chạy lại để cập nhật: không sinh lại mật khẩu database và SESSION_SECRET nếu .env đã có.

set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$THU_MUC/dung-chung.sh"
tai_cau_hinh "$THU_MUC/deploy.properties"
yeu_cau_root

export DEBIAN_FRONTEND=noninteractive
if ! git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$APP_DIR"; then
  git config --global --add safe.directory "$APP_DIR"
fi

if [[ ! -f "$APP_DIR/package.json" ]]; then
  [[ -n "${GIT_REPO_URL:-}" ]] || loi "Chưa có mã tại $APP_DIR. Điền GIT_REPO_URL hoặc copy project vào đó"
  log "Clone $GIT_REPO_URL"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "${GIT_BRANCH:-main}" "$GIT_REPO_URL" "$APP_DIR"
elif [[ -d "$APP_DIR/.git" && "${GIT_PULL:-true}" == "true" ]]; then
  log "Cập nhật mã nhánh ${GIT_BRANCH:-main}"
  git -C "$APP_DIR" fetch origin "${GIT_BRANCH:-main}"
  git -C "$APP_DIR" checkout "${GIT_BRANCH:-main}"
  git -C "$APP_DIR" pull --ff-only origin "${GIT_BRANCH:-main}"
fi

[[ -f "$APP_DIR/package.json" ]] || loi "Không thấy package.json trong $APP_DIR"

tep_env="$APP_DIR/.env"
cu_url="$(gia_tri_env DATABASE_URL "$tep_env")"
cu_khoa="$(gia_tri_env SESSION_SECRET "$tep_env")"

if [[ -n "${DB_PASSWORD:-}" ]]; then
  mat_khau_db="$DB_PASSWORD"
elif [[ "$cu_url" =~ postgresql://[^:]+:([^@]+)@ ]]; then
  mat_khau_db="${BASH_REMATCH[1]}"
else
  mat_khau_db="$(openssl rand -hex 24)"
  log "Đã sinh mật khẩu PostgreSQL mới"
fi

if [[ -n "${SESSION_SECRET:-}" ]]; then
  khoa_phien="$SESSION_SECRET"
elif [[ ${#cu_khoa} -ge 16 ]]; then
  khoa_phien="$cu_khoa"
else
  khoa_phien="$(openssl rand -base64 48 | tr -d '\n')"
  log "Đã sinh SESSION_SECRET mới"
fi

log "Tài khoản PostgreSQL $DB_USER / database $DB_NAME"
mat_khau_sql="${mat_khau_db//\'/\'\'}"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${mat_khau_sql}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${mat_khau_sql}';
  END IF;
END
\$\$;
SQL
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
fi
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
runuser -u postgres -- psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "ALTER SCHEMA public OWNER TO ${DB_USER};"

log "Ghi $tep_env"
umask 077
{
  printf 'DATABASE_URL=%s\n' "postgresql://${DB_USER}:${mat_khau_db}@127.0.0.1:5432/${DB_NAME}"
  printf 'DASHBOARD_DATA_SOURCE=%s\n' "${DASHBOARD_DATA_SOURCE:-live}"
  printf 'SHOW_PLANNED_MODULES=%s\n' "${SHOW_PLANNED_MODULES:-false}"
  printf 'SESSION_SECRET=%s\n' "$khoa_phien"
  printf 'ANTHROPIC_API_KEY=%s\n' "${ANTHROPIC_API_KEY:-}"
  printf 'ANTHROPIC_MODEL=%s\n' "${ANTHROPIC_MODEL:-}"
  printf 'STORAGE_DRIVER=%s\n' "${STORAGE_DRIVER:-may_chu}"
  printf 'S3_BUCKET=%s\n' "${S3_BUCKET:-}"
  printf 'S3_REGION=%s\n' "${S3_REGION:-}"
  printf 'S3_ACCESS_KEY_ID=%s\n' "${S3_ACCESS_KEY_ID:-}"
  printf 'S3_SECRET_ACCESS_KEY=%s\n' "${S3_SECRET_ACCESS_KEY:-}"
  printf 'S3_PREFIX=%s\n' "${S3_PREFIX:-}"
  printf 'POSTGRES_BIN=%s\n' "/usr/lib/postgresql/${POSTGRES_VERSION}/bin"
} > "$tep_env"
chmod 600 "$tep_env"
mkdir -p "$APP_DIR/storage"

log "Cài gói và build"
cd "$APP_DIR"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
env -u NODE_ENV npm ci
npx prisma generate
npx prisma db push
if [[ "${RUN_SEED:-true}" == "true" && ! -f "$APP_DIR/.deploy-seeded" ]]; then
  log "Nạp dữ liệu lần đầu"
  npm run db:seed
  touch "$APP_DIR/.deploy-seeded"
  echo "Đăng nhập lần đầu: tài khoản minh, mật khẩu LienViet@2026. Đổi ngay trong màn Người dùng."
fi
env NODE_ENV=production npm run build

log "PM2 $PM2_NAME cổng $APP_PORT"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" --cwd "$APP_DIR" -- start -- -H 127.0.0.1 -p "$APP_PORT"
fi
pm2 save
if ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
  pm2 startup systemd -u root --hp /root
  pm2 save
fi

if [[ "${ENABLE_SSL:-true}" == "true" ]]; then
  echo "Xong. Mở https://${DOMAIN}"
else
  echo "Xong. Mở http://${DOMAIN}"
fi
