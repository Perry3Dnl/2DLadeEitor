# Ontwikkeling en deployment

Dit document bevat operationele projectinformatie voor maintainers; de publieke README beschrijft het product.

## Lokaal ontwikkelen

Node.js 22. Start met `npm install` en `npm run dev`. Controleer wijzigingen met `npm run test`, `npm run typecheck` en `npm run build`.

## Hosting

GitHub Actions bouwt de statische Next.js-site. De app wordt geserveerd door Nginx in een aparte Docker-container op `127.0.0.1:8097`, gekoppeld aan het bestaande Docker-netwerk `dummy-stock-simulator_default`.

De beoogde route is `https://lade.perry3d.nl`, waarvoor DNS naar de bestaande server moet wijzen.

Deployment gebruikt de repositorysecrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PASSWORD` en optioneel `DEPLOY_PORT`. Bij voorkeur staat `DEPLOY_HOST_KEY_FINGERPRINT` als repositoryvariabele ingesteld.

Het deployscript werkt alleen binnen `/opt/2dladeeditor` en voegt de Caddy-route alleen toe na een succesvolle preflight en container-healthcheck. Bij een fout in Caddy-validatie wordt de oorspronkelijke configuratie hersteld. Bestaande containers en volumes mogen niet worden verwijderd of opnieuw gestart.

## Releases

Maak wijzigingen op een featurebranch, laat de CI-checks slagen, merge via een pull request en controleer daarna zowel de deploy-run als de daadwerkelijk bereikte publieke revisie.
