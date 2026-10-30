#!/usr/bin/env bash
# Cài môi trường Ubuntu một lần, chạy lại vẫn an toàn: gói đã có thì bỏ qua phần nặng.
# Node, PostgreSQL, Git, Nginx, Certbot, tường lửa, SSH, chứng chỉ.

set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$THU_MUC/dung-chung.sh"
tai_cau_hinh "$THU_MUC/deploy.properties"
yeu_cau_root
if [[ "${ENABLE_SSL:-true}" == "true" && -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  loi "Điền LETSENCRYPT_EMAIL trong deploy/deploy.properties"
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

log "Múi giờ ${TIMEZONE:-Asia/Ho_Chi_Minh}"
timedatectl set-timezone "${TIMEZONE:-Asia/Ho_Chi_Minh}" || true

log "Gói nền"
apt-get update
apt-get install -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold \
  ca-certificates curl gnupg git nginx ufw openssl openssh-server

if [[ "${SWAP_MB:-0}" != "0" ]] && ! swapon --show | grep -q .; then
  log "Tạo swap ${SWAP_MB}MB"
  fallocate -l "${SWAP_MB}M" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_MB"
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  log "Cài Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  hash -r
fi
log "Node $(node -v), npm $(npm -v)"

if ! dpkg -s "postgresql-${POSTGRES_VERSION}" >/dev/null 2>&1; then
  log "Cài PostgreSQL $POSTGRES_VERSION"
  install -d /usr/share/postgresql-common/pgdg
  if [[ ! -f /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc ]]; then
    curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
      https://www.postgresql.org/media/keys/ACCC4CF8.asc
  fi
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update
  apt-get install -y "postgresql-${POSTGRES_VERSION}"
fi
systemctl enable --now postgresql
systemctl enable --now ssh || systemctl enable --now sshd

if ! command -v pm2 >/dev/null 2>&1; then
  log "Cài PM2"
  npm install -g pm2
fi

if [[ "${ENABLE_SSL:-true}" == "true" ]]; then
  apt-get install -y certbot python3-certbot-nginx
fi

if [[ -n "${SSH_PUBLIC_KEY:-}" ]]; then
  log "Gắn khóa SSH"
  install -d -m 700 /root/.ssh
  touch /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  grep -qxF "$SSH_PUBLIC_KEY" /root/.ssh/authorized_keys || printf '%s\n' "$SSH_PUBLIC_KEY" >> /root/.ssh/authorized_keys
fi

if [[ "${DISABLE_SSH_PASSWORD:-false}" == "true" ]]; then
  [[ -s /root/.ssh/authorized_keys ]] || loi "Chưa có khóa SSH trong authorized_keys, không tắt mật khẩu"
  printf 'PasswordAuthentication no\n' > /etc/ssh/sshd_config.d/99-khong-mat-khau.conf
  systemctl reload ssh || systemctl reload sshd
fi

if [[ "${ENABLE_UFW:-true}" == "true" ]]; then
  log "Mở SSH và Nginx trên tường lửa"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
fi

ten_site="lienvietdoor"
tep_site="/etc/nginx/sites-available/${ten_site}"
ten_may=("$DOMAIN")
[[ -n "${DOMAIN_WWW:-}" ]] && ten_may+=("$DOMAIN_WWW")
chuoi_ten="${ten_may[*]}"

kiem_tra_dns() {
  local ten="$1" ip_dns ip_may
  ip_dns="$(getent ahostsv4 "$ten" | awk '{print $1; exit}')"
  [[ -n "$ip_dns" ]] || loi "Không phân giải được $ten. Tạo bản ghi A trỏ về IP VPS rồi chạy lại."
  ip_may="$(curl -4 -fsS --max-time 8 https://api.ipify.org || true)"
  if [[ -n "$ip_may" && "$ip_may" != "$ip_dns" ]]; then
    loi "DNS $ten đang là $ip_dns nhưng IP máy này là $ip_may"
  fi
}

viet_nginx_http() {
  cat > "$tep_site" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${chuoi_ten};
    client_max_body_size ${UPLOAD_MB:-50}m;
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
EOF
}

viet_nginx_https() {
  cat > "$tep_site" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${chuoi_ten};
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${chuoi_ten};
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size ${UPLOAD_MB:-50}m;
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
EOF
}

rm -f /etc/nginx/sites-enabled/default
ln -sfn "$tep_site" "/etc/nginx/sites-enabled/${ten_site}"

if [[ "${ENABLE_SSL:-true}" == "true" ]]; then
  if [[ "${KIEM_TRA_DNS:-true}" == "true" ]]; then
    for ten in "${ten_may[@]}"; do
      kiem_tra_dns "$ten"
    done
  fi
  if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    log "Xin chứng chỉ Let's Encrypt"
    viet_nginx_http
    nginx -t
    systemctl reload nginx
    tham_so=(-d "$DOMAIN")
    [[ -n "${DOMAIN_WWW:-}" ]] && tham_so+=(-d "$DOMAIN_WWW")
    certbot certonly --nginx --non-interactive --agree-tos --keep-until-expiring \
      --email "$LETSENCRYPT_EMAIL" "${tham_so[@]}"
  fi
  viet_nginx_https
  systemctl enable certbot.timer 2>/dev/null || true
else
  viet_nginx_http
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx
log "Máy chủ đã sẵn sàng"
