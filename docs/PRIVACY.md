# Privacy

Agon's privacy position is architectural, not a policy sentence: personal
records are processed on the device and there is no company copy of them.

## What never happens

- No account, sign-in or server-side profile.
- No analytics SDK, advertising identifier, tracking pixel, session replay or
  fingerprinting.
- No automatic crash-report upload.
- No sale, model training or profiling of personal data.
- No personal data in URLs, headers, error reports or telemetry.
- No remote third-party scripts.

## What leaves the device

Nothing, unless the person does it deliberately:

- A backup file, encrypted with their own passphrase before it is written, goes
  to storage they choose. Agon cannot open it without that passphrase and keeps
  no copy.
- A readable export, only behind an explicit confirmation, is unencrypted by
  design.
- A diagnostic report, which they preview first, contains versions and
  non-personal counts. Workout records, logs and the nickname are never
  attached automatically.
- Serving application files over HTTPS exposes connection metadata such as an
  IP address to the infrastructure that serves them. No personal record is
  included, and access logs are disabled where that is possible.

## Honest limits

This is not a claim that no service ever sees anything, and it is not a claim of
immunity to a compromised device. Cloud backups chosen by the person involve
Apple, Google or another provider — not Agon — and their handling applies.
Agon cannot delete files that already exist in someone's cloud drive, and
deleting local data explains that plainly.
