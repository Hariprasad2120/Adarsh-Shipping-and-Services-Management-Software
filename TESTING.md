# Testing

## Commands

```bash
npm run lint
npm run test
npm run build
```

## Minimum Manual Verification

1. Log in with the CHA test admin.
2. Confirm `/dashboard` redirects to `/cha`.
3. Confirm blocked modules such as `/crm` and `/hrms` return `404`.
4. Confirm `/api/health` returns `200`.
5. Validate CHA job creation, assignment, approvals, and expenses.
