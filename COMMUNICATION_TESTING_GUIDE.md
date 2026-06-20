# Monolith Communication Hub Testing Guide

This document describes how to execute automated tests for the Monolith Communication Hub.

## 1. Directory Structure
Create all test suites under the corresponding service directory:
`src/modules/communication/__tests__/`

## 2. Test Scenarios

### Tenant Isolation Tests
- Write mock queries verifying that a user in `Org A` attempting to fetch a chat message or email in `Org B` receives a `ForbiddenError` or `null`.
- Verify that `orgId` constraints are automatically verified inside the service functions.

### Permission Gate Tests
- Mock user session permissions and verify that calling `createTodoTask` or sending a chat message triggers `requirePermission` correctly.
- Verify that unauthorized sessions receive a 403 status code when accessing API routes.

### Resource Scheduling Conflict Tests
- Attempt to create two calendar events in the same time frame booking the same room asset `ResourceId`.
- Verify that the second request throws a validation error and blocks the insert.

## 3. Running the Test Suite

Run the tests using `vitest`:
```bash
npm run test
```

Or target only the communication tests:
```bash
npx vitest run src/modules/communication/__tests__/
```
