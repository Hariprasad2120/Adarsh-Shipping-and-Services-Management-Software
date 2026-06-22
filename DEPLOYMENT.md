# Deployment

## Vercel

1. Create a new Vercel project from this repository or working copy.
2. Set `APP_EDITION=cha`.
3. Add all required environment variables from [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).
4. Run database migrations with `npm run db:migrate:deploy`.
5. Optionally bootstrap the CHA admin with:

```bash
npm run db:bootstrap:cha-admin
```

6. Trigger the first deployment with:

```bash
npm run build
```

## Health Check

- `GET /api/health`

## Rollback

1. Redeploy the previous successful Vercel deployment.
2. If a schema migration was part of the failed release, restore the database from the latest backup before re-enabling traffic.
