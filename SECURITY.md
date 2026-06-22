# Security

## Controls Added

- CHA-only edition switch via `APP_EDITION=cha`
- Non-CHA modules hidden from navigation in CHA edition
- Non-CHA route prefixes return `404` in CHA edition
- Non-CHA API prefixes return `404` in CHA edition
- Case-insensitive credential lookup for login
- Global security headers and API no-store headers
- Existing session revocation and logout invalidation remain in place

## Known Gaps

- CHA document storage still needs a dedicated object-storage implementation with signed access.
- The current auth model does not yet provide a true first-login password change workflow.
