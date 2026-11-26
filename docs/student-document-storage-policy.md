# Student document storage policy

Status: adopted for this implementation on 26 August 2026.

This is the recommended baseline for student evidence until a formally
approved institutional policy supersedes it. Production enablement still
requires the deployment owner to configure and evidence the malware-scanning
step described below.

## Storage and access

- Store evidence in the private Supabase Storage bucket `student-documents`.
- Store only an opaque object path in application data. Paths must be scoped as
  `{institution_id}/{student_id}/{category}/{random-id}-{safe-filename}`.
- Never render `file_url` or an object path as a public link. Server routes
  authorize the caller and issue a signed URL valid for 10 minutes.
- The browser never receives a service-role key and does not call Storage with
  elevated credentials.

## File controls

- Maximum object size: 20 MiB.
- Accepted MIME types: PDF, JPEG, PNG, HEIC, legacy Word (`.doc`), and Office
  Open XML Word (`.docx`). The server validates MIME type and size; the browser
  `accept` attribute is only a usability aid.
- Filenames are reduced to safe ASCII path components. The checksum is stored
  for integrity and audit correlation.
- New uploads remain `PENDING` until an authorized administrator reviews them.

## Retention, replacement, and deletion

- Uploads are versioned. A replacement creates a new object and metadata row;
  prior versions are archived and remain auditable.
- No physical deletion or destructive metadata deletion is exposed by the
  application. Retention and legal-hold decisions must be handled by an
  approved records process.
- A future deletion job must require an explicit retention decision, write an
  audit event, and remove the object only after the metadata transition is
  durable.

## Malware scanning gate

- A production deployment must scan each object before it becomes eligible for
  approval or downstream use. The current repository has no scanner adapter,
  so this remains a deployment gate rather than an invented client-side check.
- Until a scanner is configured, uploads are suitable only for controlled
  development/testing and must not be treated as production-cleared evidence.
