# Deletion manifest

Decision date: 2026-07-30.

The exact deletion list is the branch's Git deletion diff. Before deletion,
each group was checked with `git ls-files`, `rg`, package/config inspection,
route conventions, and the unmodified production build.

| Exact path scope | Files | Classification | Evidence and decision |
| --- | ---: | --- | --- |
| `artifacts/**` | 315 | Generated output | PNG screenshots, JSON verification output, and dev/build logs produced by retained verification scripts. No source import, runtime asset URL, package command, CI, Docker, database, cron, fixture, or public-asset role. Remove; ignore `/artifacts/`; scripts recreate outputs. |
| `scrap/**` | 33 | Duplicate implementation | Compiler/lint/test excluded copied Communication prototype with no imports or package/config entrypoint. Active replacements exist under `src/app/(dashboard)/communication` and `src/modules/communication`. Remove; ignore `/scrap/`. |
| `Adarsh-Shipping-and-Services-Management-Software/**` | 6 | Duplicate implementation | Nested partial repository copy: `.gitignore`, instructions, config, prompt, and one reference CSS file. Explicitly excluded from lint; no runtime/config entrypoint. Root copies or authoritative `_design-reference` replacements exist. Remove and ignore the nested folder name. |
| `lan-server.stderr.log` | 1 | Generated output | Root development log; no reference or runtime role. Remove; ignore `*.log`. |
| `local-server.stderr.log` | 1 | Generated output | Root development log; no reference or runtime role. Remove; ignore `*.log`. |
| `local-server.stdout.log` | 1 | Generated output | Root development log; no reference or runtime role. Remove; ignore `*.log`. |
| `docs/performance-file-audit.md` | 1 | Generated output | Reproducible static inspection report; no runtime role. Architectural performance records retained. Remove. |
| `src/components/module-home.tsx` | 1 | Confirmed unused | Exact import-path and `ModuleHome` symbol searches found no active consumer. Only a legacy archive listing names the historical path. Remove duplicate legacy composition. |

Total confirmed deletion: 359 files.

## Validation required and obtained

- Baseline production build: passed before deletion.
- Post-move production TypeScript: passed.
- Communication/Admin static verifier: passed.
- Auth/Misc verifier reaches its documented stale pre-existing
  `await auth()` assertion; component-path checks before that point pass.
- Final build and route smoke results are recorded in the cleanup report.

