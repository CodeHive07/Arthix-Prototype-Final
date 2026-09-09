# Arthix Deployment

## Local demo

```powershell
npm ci
npm run dev
```

Local development uses browser workspace storage and an in-memory case adapter when `DATABASE_URL` is not configured.

## Applicant pilot stack

The reproducible local pilot stack runs PostgreSQL, MinIO and Keycloak:

```powershell
docker compose -f docker-compose.pilot.yml up -d
Copy-Item .env.pilot.example .env.local
npm run db:migrate
npm run dev
```

Before starting the app, replace `OIDC_CLIENT_SECRET` in `.env.local` with the confidential client secret from Keycloak. The pilot services are available at:

- PostgreSQL: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`
- Keycloak: `http://localhost:8080`

The compose stack creates the private `arthix-documents` bucket. It uses local-only credentials and must not be exposed to the internet or reused in production.

## Production prerequisites

Configure the variables in `.env.example` through the hosting provider's secret manager. Do not commit `.env` files or expose server secrets with `NEXT_PUBLIC_` names.

## Keycloak Applicant sign-in

For local development, start the included Keycloak service:

```powershell
docker compose -f docker-compose.keycloak.yml up -d
```

Open `http://localhost:8080`, sign in with the bootstrap admin credentials from the compose file, and change the admin password immediately. The realm import creates the `arthix` realm and `arthix-web` client. Replace the imported client secret before using it beyond a local test.

Set these application variables in `.env.local`:

```env
KEYCLOAK_ISSUER=http://localhost:8080/realms/arthix
OIDC_CLIENT_ID=arthix-web
OIDC_CLIENT_SECRET=<client-secret-from-keycloak>
OIDC_REDIRECT_URI=http://localhost:3000/api/auth/callback
AUTH_SECRET=<long-random-secret>
```

For hosted Keycloak, set `KEYCLOAK_ISSUER` to the HTTPS realm issuer and register the exact HTTPS callback URL `${APP_URL}/api/auth/callback` in the client. Use a confidential client, standard authorization code flow, PKCE `S256`, and no direct access grants.

Required for a production deployment:

- `APP_URL` using HTTPS.
- `DATABASE_URL` pointing to PostgreSQL.
- `AUTH_SECRET` generated from a password manager or secret manager.
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` for private document storage.
- An approved identity-provider integration before granting real users access. The current signed-session helper is a foundation, not a complete login system.

Optional integrations are server-side only: OGD variables enable the data.gov.in adapter and OpenAI variables enable grounded explanations.

## Database migration

Run migrations once against the target database before starting the web process:

```powershell
$env:DATABASE_URL = "postgresql://..."
npm run db:migrate
```

Migrations are recorded in `schema_migrations` and are applied in filename order.

## Container deployment

Build and run the standalone image:

```powershell
docker build -t arthix .
docker run --rm -p 3000:3000 --env-file .env.production arthix
```

Run `npm run db:migrate` from a release job or one-off task, not from every web replica at startup. Check `/api/health` for liveness and `/api/ready` for deployment readiness.

## Production checklist

- Configure private database networking, backups and restore testing.
- Configure private object storage, lifecycle rules and malware scanning at the storage boundary.
- Connect the approved IdP and map applicant, department and facilitation roles server-side.
- Set retention, audit-log, incident-response and data-subject handling policies.
- Verify official department/API authorization before enabling any external submission workflow.
- Monitor `/api/health`, `/api/ready`, database errors, storage failures and authentication failures.
