# Performance Engineering

This engineering guide is the authoritative location for the structural and
performance integration rules that must be preserved while carrying source
branch optimizations forward into `main`.

See the full guide in [../PERFORMANCE.md](../PERFORMANCE.md).

Key rules:

- keep the guarded local-start wrapper and Turbopack-first development flow;
- preserve request-scoped auth/session reads and independent API auth;
- preserve consolidated runtime polling and prevent duplicate timers;
- keep CHA Create Job data lazy and permission-protected;
- keep telemetry opt-in and safe;
- keep the Justdial worker isolated from import-time database startup;
- rerun current measurements after integration instead of reusing historical
  source-branch numbers.
