# Requirements Traceability Matrix — SIAP

## Coverage graph

Tabel di bawah memetakan hubungan many-to-many dari kebutuhan (`REQ`/`NFR`) ke cerita pengguna (`US`), keputusan arsitektur (`ADR`), model data (`MODEL`), antarmuka API/WS (`EP`), layar (`UI`), alur (`FLOW`), dan kasus uji (`TC`). Semua ID di bawah ini merujuk pada definisi kanoniknya masing-masing.

| # | Requirement | User Stories | Decisions | Data Models | Endpoints / WS | UI Screens | UX Flows | Test Cases |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REQ-001 | US-001 | ADR-001, ADR-002 | MODEL-002, MODEL-007 | EP-001, EP-002, EP-003, EP-004 | UI-001, UI-010, UI-016 | FLOW-001 | TC-001, TC-002 |
| 2 | REQ-002 | US-002 | ADR-001, ADR-005 | MODEL-002 | EP-004, EP-013, EP-017 | UI-001, UI-011, UI-014, UI-015 | FLOW-001 | TC-003 |
| 3 | REQ-003 | US-003 | ADR-003 | MODEL-001, MODEL-003 | EP-005, EP-006, EP-007 | UI-012 | FLOW-002 | TC-004, TC-005, TC-006 |
| 4 | REQ-004 | US-004 | ADR-001 | MODEL-003, MODEL-010 | EP-005, EP-006 | UI-012 | FLOW-003 | TC-007 |
| 5 | REQ-005 | US-005 | ADR-003 | MODEL-004 | EP-008, EP-015 | UI-004, UI-013 | FLOW-004, FLOW-010 | TC-008 |
| 6 | REQ-006 | US-006 | ADR-003 | MODEL-005 | EP-009, EP-015 | UI-004, UI-014 | FLOW-005, FLOW-010 | TC-009 |
| 7 | REQ-007 | US-007 | ADR-005 | MODEL-006 | EP-010, EP-016 | UI-005, UI-015 | FLOW-006, FLOW-011 | TC-010 |
| 8 | REQ-008 | US-009 | ADR-004, ADR-005 | MODEL-001, MODEL-003, MODEL-004 | EP-013, EP-018 | UI-002 | FLOW-008 | TC-012, TC-013 |
| 9 | REQ-009 | US-010 | ADR-001 | MODEL-003 | EP-014 | UI-003 | FLOW-009 | TC-013 |
| 10 | REQ-010 | US-008 | ADR-005 | MODEL-008 | EP-011, EP-016 | UI-006, UI-016 | FLOW-007, FLOW-011 | TC-011 |
| 11 | REQ-011 | US-011 | ADR-005, ADR-006 | MODEL-001, MODEL-002, MODEL-009, MODEL-010 | EP-012, EP-017 | UI-007, UI-008, UI-009, UI-011 | FLOW-012 | TC-014 |
| 12 | REQ-012 | US-006, US-012 | ADR-001 | MODEL-002, MODEL-004, MODEL-005, MODEL-008 | EP-004, EP-008, EP-009, EP-017 | UI-009, UI-014 | FLOW-005, FLOW-012 | TC-015 |
| 13 | NFR-001 | US-001 | ADR-002 | MODEL-007 | EP-002 | UI-001, UI-010 | FLOW-001 | TC-003 |
| 14 | NFR-002 | US-003, US-008 | ADR-003, ADR-005 | MODEL-003, MODEL-004, MODEL-008 | EP-004, EP-005, EP-008, EP-011 | UI-012, UI-013, UI-016 | FLOW-002, FLOW-007 | TC-011, TC-016 |
| 15 | NFR-003 | US-001 | ADR-002 | MODEL-002 | EP-002, EP-017 | UI-007 | FLOW-001, FLOW-012 | TC-001, TC-014 |
| 16 | NFR-004 | US-001 | ADR-005 | MODEL-001 | EP-001, EP-017 | UI-002 | FLOW-008 | TC-016 |
| 17 | NFR-005 | US-009 | ADR-004 | MODEL-003 | EP-013, EP-018 | UI-002 | FLOW-008 | TC-012 |
| 18 | NFR-006 | US-001, US-003, US-005 | ADR-005 | MODEL-002, MODEL-003, MODEL-004 | EP-002, EP-005, EP-008 | UI-001 | FLOW-001 | TC-001, TC-004, TC-008 |

## Non-applicable mappings

- **N/A — Pemetaan AI/Agentic (`AGENT`, `TOOL`, `PROMPT`, `EVAL`)**: Aplikasi SIAP tidak menjalankan LLM atau agen AI runtime (`features.ai = false`), sehingga tidak ada definisi maupun edge traceability untuk kategori tersebut.
- **N/A — Layar UI untuk Endpoint Kesehatan & Cron (`EP-001`)**: `GET /health` dan pekerjaan latar belakang `node-cron` (`backend/src/index.ts`) tidak memiliki antarmuka layar pengguna langsung.

## Unresolved mappings

- **Unresolved — Pengukuran Baseline `NFR-005`**: Metode uji beban dan target latensi/konkurensi belum ditetapkan; `TC-012` baru menguji integrasi fungsional & build Socket.io, belum mengukur beban skala besar di staging.
- **Unresolved — Uji Interaktif Emulator Android `TC-007` & Visual `UI-010..UI-016`**: Seluruh logika offline sync mobile (`NetworkManager.tsx`, `AbsensiScreen.tsx`, `database.ts`) telah diperbarui dan terverifikasi oleh ESLint (`0` error), namun eksekusi langsung di emulator Android belum dijalankan pada sesi Windows ini (`Not run`).

## Audit counts

Statistik hasil eksekusi deterministik `python .agents/skills/architect-docs-engine/scripts/cli.py traceability --project . --json`:
- **Defined IDs:** `108` (`REQ`: 12, `NFR`: 6, `US`: 12, `ADR`: 6, `MODEL`: 10, `EP`: 18, `UI`: 16, `FLOW`: 12, `TC`: 16)
- **Referenced IDs:** `108`
- **Covered IDs:** `108`
- **Dangling IDs:** `0`
- **Duplicate IDs:** `0`
- **Orphaned IDs:** `0`
- **Penanda Tidak Berlaku (`not_applicable`):** `8` (seluruhnya disertai alasan eksplisit `N/A — alasan`)
- **Unresolved Statements:** Tercatat secara transparan di [_AUDIT_REPORT.md](_AUDIT_REPORT.md) dan hanya mencakup item di luar sandbox dev lokal (`NFR-005` uji beban staging, TLS VPS produksi, dan eksekusi interaktif emulator Android).
