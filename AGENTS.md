# Architecture rules

- Derive ride participants and progress from trip-scoped persisted chat messages, not merchant account flags or proximity; reloads must preserve the same stage on both devices.
- Keep ride calculations and progress validation in a pure journey module, with focused Bun tests; route estimates are advisory and never override an agreed fare.
- Reuse the map-choice sheet for external navigation and mount interactive ride maps only on expansion; this preserves native navigation handling and limits map loads.