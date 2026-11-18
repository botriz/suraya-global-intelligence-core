# Suraya Global Intelligence Core

A small ESM foundation for the Suraya identity and governance state. This repository is a library foundation, not a complete autonomous AI agent.

## Security changes

Core state is encrypted using **AES-256-GCM** with a unique random salt and nonce for each write. The encryption key is derived from `SURAYA_CORE_SECRET` using Node.js scrypt. The secret is never stored in this repository.

The state file is written atomically with restrictive file permissions. The local `secure/` directory is ignored by Git.

## Required configuration

Set `SURAYA_CORE_SECRET` to a randomly generated secret of at least 32 UTF-8 bytes in the deployment's secret manager. Do not put it in source control, chat logs, or a committed `.env` file.

Optional:
- `SURAYA_CORE_PATH`: absolute path for the encrypted state file. Defaults to `secure/core.enc` beside this module.
- `SURAYA_SAVIOR_KEY_SHA256`: comma-separated SHA-256 hashes of explicitly approved recovery tokens. If unset, recovery-token unlock is disabled.

On first use, the core initializes a locked default state. If the secret is missing or too short, it fails closed.

## API

- `readCore()`: read and authenticate the encrypted state.
- `writeCore(state)`: atomically encrypt and persist a state object.
- `createCoreStore({ secret, filePath })`: create an isolated store instance, useful for tests and controlled integrations.

Legacy files encrypted with the previous hardcoded AES-CBC key are **not silently migrated**. Back them up and migrate them only in a controlled environment after confirming the actual secret and state.

## Tests

```bash
npm test
```

Tests cover encrypted round-trip, restrictive file permissions, short-secret rejection, and tamper detection.

## Operational boundary

This core does not grant administrative access to HTTP clients and does not authorize autonomous actions. Every privileged operation must be authenticated, scoped, logged, and explicitly approved by the creator where required.
