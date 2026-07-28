# Legacy visual code archive

This directory contains recoverable visual-source snapshots from before the
Monolith migration foundation and presentation-only snapshots taken immediately
before an individual route is migrated.

- Do not import from this directory.
- Do not include this directory in application builds, lint, or type checking.
- Keep business logic in the production source tree; this archive exists only
  to make removed visual implementations recoverable.

Files use a `.txt` suffix so framework and TypeScript discovery cannot compile
them accidentally.

## Foundation baseline archive

`legacy-ui-before-monolith-foundation-7120d79.zip` is a Git archive of
`src/app`, `src/components`, and `src/styles` at commit `7120d79`
(`checkpoint: working dashboard before full UI migration`).

- Entries: 1,199
- Size: 1,598,247 bytes
- SHA-256:
  `7271B78353937BDD0BF733E3AA864FFEFCFD05C444172318C3B5D5B71401E043`

The archive was verified after creation by listing every entry and confirming
the dashboard page, dashboard client, Monolith shell, and production stylesheet
were present. Re-run `scripts/verify-old-ui-backup.mjs` after any transfer to
verify the checksum and required entries without extracting or compiling it.
