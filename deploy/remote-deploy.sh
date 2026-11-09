#!/usr/bin/env bash
set -euo pipefail
app=/opt/2dladeeditor
cd "$app"
command -v docker >/dev/null
docker network inspect dummy-stock-simulator_default >/dev/null
docker container inspect dummy-stock-caddy >/dev/null
docker compose version >/dev/null
# Refuse conflicting host port; do not stop or modify unrelated containers.
owner="$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E '(:|->)8097' || true)"
if [ -n "$owner" ] && ! printf '%s' "$owner" | grep -q '^2dladeeditor-web '; then
  echo "Port 8097 is already in use by another service: $owner" >&2; exit 1
fi
# Locate the actual bind-mounted shared Caddyfile, not a guessed server path.
caddy_file="$(docker inspect dummy-stock-caddy --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')"
if [ -z "$caddy_file" ] || [ ! -f "$caddy_file" ]; then
  echo "Shared Caddyfile is not a bind-mounted file; refusing to edit proxy" >&2; exit 1
fi
if grep -q 'lade.perry3d.nl' "$caddy_file" && ! grep -q '# 2DLadeEitor managed route' "$caddy_file"; then
  echo "Existing lade.perry3d.nl route is not owned by this project" >&2; exit 1
fi
# Verify the container can reach the shared network before changing the proxy.
tar -xzf source.tar.gz
docker compose config --quiet
docker compose up -d --build web
healthy=false
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:8097/health >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done
if [ "$healthy" != true ]; then
  echo "Health check failed after startup grace period" >&2
  docker compose ps
  docker logs --tail=80 2dladeeditor-web || true
  exit 1
fi
backup="$caddy_file.2dladeeditor-$(date +%Y%m%d%H%M%S).bak"
cp -p "$caddy_file" "$backup"
python3 - "$caddy_file" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);s=p.read_text()
begin='# 2DLadeEitor managed route'
if begin not in s:
 s+='\n'+begin+'\nlade.perry3d.nl {\n  encode gzip\n  reverse_proxy 2dladeeditor-web:80\n}\n'
p.write_text(s)
PY
if ! docker exec dummy-stock-caddy caddy validate --config /etc/caddy/Caddyfile; then
  cp -p "$backup" "$caddy_file"
  echo "Caddy validation failed; restored configuration" >&2
  exit 1
fi
if ! docker exec dummy-stock-caddy caddy reload --config /etc/caddy/Caddyfile; then
  cp -p "$backup" "$caddy_file"
  docker exec dummy-stock-caddy caddy reload --config /etc/caddy/Caddyfile || true
  echo "Caddy reload failed; restored configuration" >&2
  exit 1
fi
echo "2DLadeEitor app healthy on 127.0.0.1:8097 and Caddy route configured"
