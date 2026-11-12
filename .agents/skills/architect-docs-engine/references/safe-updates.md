# Safe scanning and incremental updates

## Read and write boundaries

Resolve a real target root, follow no symlink outside it, and reject traversal. Scan bounded filenames/metadata and safe text only; skip `.git`, virtual environments, package/build output, caches, binaries, credentials, `.env`, private keys and oversized files. Never execute inspected code, run migrations, install packages, call a network service, or send source data elsewhere. Report sensitive-content detection without printing its value.

## Review-first changes

Existing docs may contain human-authored content. Compute a source snapshot from safe paths and hashes; avoid storing sensitive content. Show precise changed sections and source evidence. Default `docs.update_policy` is `review`: preserve existing target docs, IDs and unmarked sections; request review before replacement. Only modify explicit ADE-managed regions if marker boundaries are valid and no manual conflict is detected. Add IDs at the end and deprecate removed records.

Example impact map: a schema change may affect `DATA_MODEL`, `API_CONTRACT`, `VALIDATION_RULES`, `SECURITY`, `TESTING`, `TRACEABILITY`, `DECISIONS`, `_CHANGELOG` and `_AUDIT_REPORT`; a UI change may affect `UI`, `UX`, `ACCEPTANCE`, `TESTING`, `TRACEABILITY`, `_CHANGELOG` and `_AUDIT_REPORT`. Treat these as candidates, not permission for a rewrite.

Support dry-run previews for every write helper. Preserve UTF-8 and line endings where practical. Do not delete, commit, push, publish, deploy or mutate application code automatically. The installer copies only this skill directory, refuses a differing existing install by default, and backs up before an explicit forced replacement.
