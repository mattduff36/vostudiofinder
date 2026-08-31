# ADR-001: Project authority and historical evidence

Status: Accepted
Date: 31 August 2026

## Decision

Voiceover Studio Finder uses `AGENTS.md`, scoped `.cursor/rules`, canonical docs and current code/tests/config in a defined authority chain. Dated implementation summaries, archived PRDs, backups/private material and project archives are historical evidence rather than current authority.

The legacy `.cursorrules` prompt-optimizer persona is removed from active project governance after archival.

## Consequences

Cursor gets a smaller, more reliable context and must investigate documented-vs-implemented conflicts instead of blindly following the newest-looking note.
