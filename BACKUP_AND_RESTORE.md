# Backup And Restore

## Backup

1. Create a managed Postgres snapshot using your provider tooling.
2. Export Prisma migration state and deployment commit SHA.
3. Store Vercel environment variables separately from the database backup.

## Restore

1. Restore the latest healthy Postgres snapshot to a new database.
2. Point `DATABASE_URL` at the restored instance.
3. Run `npm run db:migrate:deploy` only if the restored snapshot is behind the deployed migration state.
4. Re-run `npm run db:bootstrap:cha-admin` only if the test admin is missing.
