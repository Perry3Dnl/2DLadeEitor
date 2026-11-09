# 2DLadeEitor

Browsergebaseerde 2D lade-indeling voor losse 3D-printbare bakjes. Next.js 15, TypeScript, statische export, geen backend.

## Lokaal
Node.js 22. `npm install`, `npm run dev`. Tests: `npm run test`, `npm run typecheck`, `npm run build`.

## Status MVP
Automatisch 3×2 raster, splitsen en samenvoegen, maten wijzigen, individueel binary STL downloaden en project als JSON bewaren. Nog te maken: drag-and-drop grenzen, ZIP-export, JSON-import en fysieke printcontrole.

## Deployment
GitHub Actions bouwt statische website; Nginx draait via Docker op alleen `127.0.0.1:8097`, en via Docker-netwerk `dummy-stock-simulator_default`. Gewenste Caddy-host: `lade.perry3d.nl`. GitHub Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PASSWORD`, optioneel `DEPLOY_PORT`. Stel bij voorkeur `DEPLOY_HOST_KEY_FINGERPRINT` repository variable in. De deployment voert eerst een poort-/netwerk-/Caddy-preflight uit en schrijft alleen naar `/opt/2dladeeditor`. Een DNS-record voor de subdomain moet naar de bestaande server wijzen.

Geen bestaande volumes verwijderen, geen `--remove-orphans`, en geen andere applicaties herstarten.
