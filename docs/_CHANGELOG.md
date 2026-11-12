# Changelog Dokumentasi — SIAP

## Unresolved & Unreleased

### Unreleased

- Pengukuran baseline kinerja beban **`NFR-005`**, instalasi sertifikat SSL/TLS Nginx produksi (`infra/nginx/conf.d/default.conf`), serta uji interaktif pada perangkat/emulator Android ([OPERATIONS.md](OPERATIONS.md), [TESTING.md](TESTING.md)).

## Version history

| Versi Suite | Stempel Waktu (UTC) | Ringkasan Perubahan | Dokumen & ID Terdampak | Bukti / Verifikasi |
| --- | --- | --- | --- | --- |
| `1.1.0` | `2026-11-12T14:53:00Z` | Penyelesaian dan verifikasi Milestone **M1–M4** ([IMPLEMENTATION.md](IMPLEMENTATION.md)), penetapan keputusan desain Web Dark (`#121212`/`#1ed760`) & Mobile Light (`#f3fcef`/`#006e2f`) serta interval laporan SATPAM per 3 jam, penghapusan `temp-admin/` & `temp_mobile/`, dan pembaruan hasil uji otomatis backend `4/4` suite (`16/16` tes lulus). | `README.md`, `PRD.md`, `TECH_STACK.md`, `DECISIONS.md` (**ADR-005**, **ADR-006**), `DATA_MODEL.md`, `VALIDATION_RULES.md`, `API_CONTRACT.md`, `UI.md`, `UX.md`, `AGENTS.md`, `SECURITY.md`, `SEED.md`, `IMPLEMENTATION.md`, `TESTING.md` (`TC-001..TC-016`), `ACCEPTANCE.md`, `TRACEABILITY.md`, `OPERATIONS.md`, `_AUDIT_REPORT.md`, `_CHANGELOG.md`. | `backend` (`tsc`, `lint`, `build`, `4/4` Jest suites `16/16` tests PASS terhadap `siap_test_db`), `web-admin` (`lint`, `build` PASS), `mobile` (`eslint` `0` errors PASS), serta `cli.py snapshot --write --force`, `traceability`, `audit`. |
| `1.0.0` | `2026-11-12T14:10:00Z` | Pembentukan awal suite lengkap 21 dokumen kanonik SIAP dan `architect-docs.config.json` berbasis inspeksi menyeluruh codebase (`existing` lifecycle, bahasa dokumentasi `id`, `features.ai = false`), termasuk dokumentasi kesenjangan implementasi menuju penyelesaian 100%. | Seluruh 21 dokumen di `docs/` dan `architect-docs.config.json`; definisi `REQ-001..012`, `NFR-001..006`, `ADR-001..006`, `MODEL-001..010`, `EP-001..018`, `UI-001..016`, `FLOW-001..012`, `US-001..012`, `TC-001..016`. | Diverifikasi melalui `cli.py inspect`, `validate-config`, `audit`, `traceability`, dan `snapshot --write`. |
