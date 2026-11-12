# Architecture rules

- Derive ride participants and progress from trip-scoped persisted chat messages, not merchant account flags or proximity; reloads must preserve the same stage on both devices.
- Keep ride calculations and progress validation in a pure journey module, with focused Bun tests; route estimates are advisory and never override an agreed fare.
- Reuse the map-choice sheet for external navigation and mount interactive ride maps only on expansion; this preserves native navigation handling and limits map loads.- Every category, including drivers, is a distance-sorted list (`src/lib/nearby.ts`); maps mount only inside an active ride chat, to cut map cost and avoid drawer gesture conflicts.

- Keep browsing GPS local and separate from mobile-service tracking; persist offline state in posts and enforce off-duty reads/uploads in the database so schedules cannot override manual privacy choices. Ride sharing remains independently controlled.
- Ship installability as manifest-only home-screen support (no app-shell service worker) — avoids stale caches in preview and after deploys.
- Share install-prompt state between the homepage banner and manual guide; use standalone/installation signals and same-day dismissal, without timed popups, to avoid duplicate installation prompts.
- Detect Apple devices independently of install-prompt support and use browser-specific bottom guidance above navigation; iOS Chrome also needs manual home-screen instructions.
- Keep existing discovery results visible during background refreshes and read failures; loading placeholders are initial-load-only to prevent periodic layout jumps.
- Read other users' display names and rating summaries through the security-invoker public_profiles view backed by an authenticated, fixed-search-path safe-field function; direct profiles reads stay owner/admin-only to protect contact details.
- Keep public SEO routes and metadata in a shared catalog with Helmet at the router layout; self-referencing canonicals prevent query variants from duplicating pages.
- Index curated bilingual city/category guides only; account routes and raw user listings stay noindex until an explicit public-content consent model exists, avoiding address and location exposure.
- Retain the existing static sitemap and hosting crawler prerendering; directory queries select safe listing identifiers/categories only and never export live GPS or profiles to SEO content.
