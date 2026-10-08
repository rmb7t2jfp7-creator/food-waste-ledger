# Changelog

## 0.3.0 — 2026-10-07

- Add browser daily check-ins with date, notes, and self-reported zero, complete, or partial observation status. Missing check-ins remain unknown.
- Require zero check-ins to have no food entries for that date, and complete check-ins to have at least one. Partial check-ins allow any number of entries.
- Preserve daily check-ins in schema-version-2 JSON backups. Migrate version-1 backups without inventing past observations.
- Add a separate check-ins CSV export. The existing food-entry CSV and Python analyzer remain entries-only and cannot represent observed zero days.
- Add plain-language usage guidance, empty private journal templates, and a structured usability-feedback issue form.

This update adds software capability and documentation. It does not report a completed real-world trial or measured environmental results.
