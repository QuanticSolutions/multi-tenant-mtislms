# Transport rework, Donations & Employees modules, embeddable forms

## 1. Fix the "Supabase URL / key not published" error on the Users page

The Users page is the only screen that uses a privileged server key (it creates
accounts and reads the auth user list). Every other page uses the public key
that is baked into the build, which is why only this table fails on your
Cloudflare deployment.

Fix:
- Add a small server-only helper that builds the admin client, falling back to
  the build-time public URL when `SUPABASE_URL` is not set on the host, so only
  one value must be configured.
- Replace the raw error with a clear, friendly message on the Users page
  ("Account management needs the server key configured on this deployment")
  instead of a red environment error.
- The service key itself still has to exist as a Cloudflare secret named
  `SUPABASE_SERVICE_ROLE_KEY` (worker secret, not a `VITE_` variable) — I'll
  document exactly where to put it. Nothing else changes.

## 2. Transport moves under Students, drivers only

- Remove Transport from the Operations group; it becomes a collapsible section
  inside the Students group in the sidebar.
- Transport page is reduced to **Drivers**: name, phone, CNIC/licence, vehicle
  registration, notes, active flag. Routes, stops, fares and vehicle records are
  retired from the UI.
- Student create/edit form gets a "Transport driver" dropdown; the link is saved
  with the student.
- Students table gets a Driver column plus a driver filter.

Database: new `drivers` table (with grants + admin/staff policies) and a
`driver_id` column on `students`. Existing transport tables stay untouched in
the database but are no longer surfaced.

## 3. Admissions / Donations / Employees as three tabs

A single "Intake" area with three tabs:
- **Admissions** — existing module, moved under the tab shell.
- **Donations** — new: donor name, contact, email, amount, purpose, payment
  method, reference, date, status (Pledged / Received / Cancelled), notes.
  Full create / edit / delete, stats cards, filter bar.
- **Employees** — new: job applications for staff (name, contact, email,
  position applied for, qualification, experience, CV/portfolio link, expected
  salary, status: New / Screening / Interview / Offered / Hired / Rejected),
  full CRUD, stats, filter bar.

Both new tables follow the existing pattern: timestamps, update trigger, grants,
admin-managed policies, and an insert path for public form submissions.

## 4. Embeddable public forms + event calendar

Public, unauthenticated routes under `/embed`:
- `/embed/admissions` — application form
- `/embed/donations` — donation form
- `/embed/employees` — job application form
- `/embed/events` — read-only month calendar of published events

Each writes through a public server endpoint that validates input, rate-limits
per submission, and never reads existing records — so an embed can only add a
record (or, for events, only read).

Each admin tab shows a "Copy embed code" button producing:

```text
<iframe src="https://your-site/embed/donations" width="100%" height="720"
        style="border:0" title="Donation form"></iframe>
```

The link matches whichever tab is open.

## 5. Events visibility

- Teachers and students get a read-only Events page (calendar + list), no create,
  edit or delete controls.
- The events embed is read-only by database policy, not just by UI.

## Technical notes

- New tables: `drivers`, `donations`, `employee_applications`; new column
  `students.driver_id`.
- Public write access is granted only through narrow insert policies scoped to
  the three intake tables; public read is granted only to published events.
- Embed routes render outside the app shell with their own minimal layout so
  they look correct inside an iframe on any site, and set
  `X-Frame-Options`-free headers to allow embedding.
- All new tables use the shared date/status formatting helpers so casing and
  day-month-year dates match the rest of the app.
