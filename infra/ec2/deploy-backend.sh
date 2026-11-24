#!/usr/bin/env bash
# runs on EC2 as root through SSM Run Command, after the workflow has checked out
# the commit to deploy in the build directory
set -euo pipefail

build_user=ssm-user
build_dir=/home/ssm-user/solo101-build
app_dir=/opt/solo101/current
previous_dir=/opt/solo101/previous
next_dir=/opt/solo101/next

# npm runs package scripts, so building stays out of root
as_builder() {
  runuser -u "$build_user" -- env HOME="/home/$build_user" "$@"
}

check_health() {
  for _ in $(seq 1 12); do
    if curl --fail --silent --max-time 5 http://127.0.0.1:3000/health > /dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

restart_backend() {
  # clears systemd's start limit after earlier failed starts
  systemctl reset-failed solo101-backend || true
  systemctl restart solo101-backend
}

cd "$build_dir"
as_builder npm ci --no-audit --no-fund
as_builder npm run build

rm -rf "$next_dir"
cp -r "$build_dir" "$next_dir"
rm -rf "$next_dir/.git"
chown -R root:solo101 "$next_dir"
chmod -R u=rwX,g=rX,o= "$next_dir"

# the previous release is kept so a failed start can be rolled back
rm -rf "$previous_dir"
if [ -d "$app_dir" ]; then
  mv "$app_dir" "$previous_dir"
fi
mv "$next_dir" "$app_dir"

restart_backend
if check_health; then
  echo "backend deployed and healthy"
  exit 0
fi

# startup logs name the failed stage without credentials
echo "health check failed, restoring the previous release" >&2
journalctl -u solo101-backend -n 20 --no-pager >&2 || true
if [ -d "$previous_dir" ]; then
  rm -rf "$app_dir"
  mv "$previous_dir" "$app_dir"
  restart_backend
  if check_health; then
    echo "previous release restored" >&2
  fi
fi
exit 1
