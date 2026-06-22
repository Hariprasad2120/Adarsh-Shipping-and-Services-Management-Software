# Monolith Engine CHA Production Edition

This edition is configured to run the `CHA` production surface only when `APP_EDITION=cha`.

## Quick Start

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build
npm run start
```

## Optional Test Admin Bootstrap

```bash
npm run db:bootstrap:cha-admin
```

## Documentation

- [CHA_PRODUCTION_SCOPE.md](CHA_PRODUCTION_SCOPE.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
- [SECURITY.md](SECURITY.md)
- [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md)
- [TESTING.md](TESTING.md)
