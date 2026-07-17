# Madina Tul Ilm — Version 2 Roadmap

Version 1 delivered 18 modules (Dashboard, Students, Teachers, Classes, Attendance, Timetable, Exams, Fees, Library, Homework, Transport, Messaging, Reports, Events, Inventory, Staff & Payroll, Admissions, Notifications, Settings, Audit). V2 fills every gap in your original spec and adds cross-cutting infrastructure.

## Coverage vs. the spec

| Area | V1 status | V2 additions |
|---|---|---|
| Admin Dashboard | Basic stat tiles | Event calendar widget, quick actions panel, weekly attendance bar chart, monthly fee collection line chart, "Today's summary" card |
| Students | List + add + delete | Full admission form with sections, profile photos, bulk CSV import (Papa Parse), student profile page, promotion workflow, per-student ledger |
| Teachers | List + add | Teacher profile page with subjects & classes taught, bulk import, resignation flow |
| Parents | ❌ Missing | New Parents module: list, add, bulk import, link to students, parent portal seed |
| Sections | Attribute on classes | Dedicated Sections tab, per-class section management, class teacher assignment |
| Subjects | ❌ Missing | Subjects module: per-class subjects, teacher allocation, ties into exams & timetable |
| Class Routine (Timetable) | Grid + slots | Subject-color coding, printable stylesheet, teacher-workload view |
| Attendance | Daily marker | Monthly report grid (student × day), PDF/CSV export, attendance % analytics |
| Exams | Schedule + marks | Grades tab (uses grading scales), tabulation sheet, marksheet PDF, question papers upload, SMS results |
| Online Exams | ❌ Missing | Online exams module: MCQ builder, timed sittings, auto-grading, attempt log |
| Study Material | ❌ Missing | Study material library per class/subject, file upload, download tracking |
| Accounting | Invoices + payments | Fee heads catalog, scholarships (holder/create/assign), expenses + categories, mass invoice generation, invoice PDF |
| Library | Catalog + issues | Book PDFs, fines on overdue returns, reservations queue |
| Noticeboard | Announcements table | Cards/table view toggle, "Show on Website" flag, archive tab |
| Messaging (chat) | Log table | Real-time thread UI with Supabase Realtime, group messages, unread badges |
| Account / Profile | ❌ Missing | Profile page + change password tab for every signed-in user |
| Notifications | Manual log | Email delivery via Lovable Emails, SMS via connector (Twilio/GatewayAPI), templated triggers (invoice, exam, absence), user preferences |
| Settings | Profile/session/grading/roles | Fee heads, expense categories, dormitories, SMS templates, backup/export |
| Audit | Table + viewer | Auto-log triggers on every table (create/update/delete), actor IP capture, filterable timeline |
| Reports | Overview | Downloadable PDF/CSV reports per module, custom date-range builder |
| Role portals | Admin only | Teacher portal (my classes, my attendance, homework), Student portal (my marks, timetable, materials), Parent portal (child overview, fees, messages), Librarian & Accountant scoped views |

## Sequenced phases

Modules move together so downstream dependencies always land after their inputs.

### Phase 1 — Academic Foundations *(unblocks exams, timetable, portals)*
1. Sections tab on Classes + class-teacher assignment
2. Subjects module tied to class + teacher
3. Parents module (list, add, link to students) + parent contact merge
4. Student promotion workflow (session-to-session bulk move)

### Phase 2 — Data Import & Profiles
5. Bulk CSV import for Students / Teachers / Parents (Papa Parse)
6. Profile photos (Supabase Storage bucket) — students, teachers, parents
7. Student / Teacher / Parent detail pages (tabs: overview, attendance, fees, results)
8. Account / Profile route with change-password

### Phase 3 — Exam & Marks Depth
9. Exam Grades tab pulling from `grading_scales`
10. Marksheet PDF generator (jspdf/react-pdf) with MTIS header
11. Tabulation sheet (class × subject × student ranking)
12. Question papers upload + downloads
13. Online Exams module: MCQ builder + timed attempts + auto-grade

### Phase 4 — Finance Expansion
14. Fee Heads catalog + invoice line items
15. Mass invoice generation (all students in class → same template)
16. Scholarships (holders, types, discount rules)
17. Expenses + Expense Categories
18. Invoice / receipt PDFs

### Phase 5 — Delivery & Communication
19. Wire real Email (Lovable Emails) into Notifications, with templates for: fee invoice created, attendance absence, exam result published, homework assigned, announcement broadcast
20. SMS connector (Twilio or GatewayAPI) + `Send SMS` tabs on Exams and Noticeboard
21. Realtime Messaging (Supabase Realtime channels + threaded UI)
22. Noticeboard cards + website-visibility toggle

### Phase 6 — Insights & Ops
23. Attendance monthly report grid + PDF/CSV export
24. Dashboard calendar widget + attendance/fee charts (Recharts) + today's summary
25. Study Material module (per class/subject, storage-backed)
26. Reports upgrade — per-module PDF/CSV export

### Phase 7 — Cross-cutting Hardening
27. Auto audit-log triggers (Postgres triggers writing to `audit_logs` on every DML) — connects to Audit module built in V1
28. Notification preference matrix per user (opt in/out per channel)
29. Backup / data export in Settings
30. Role-scoped portals: Teacher, Student, Parent, Librarian, Accountant dashboards (all reuse the existing shell but with role gates)

## How the phases link together

```text
Phase 1 (Sections, Subjects, Parents)
        │
        ├─► Phase 2 (Profiles, Imports)  ─┐
        │                                 │
        └─► Phase 3 (Exam depth)          ├─► Phase 6 (Reports, Dashboard, Study Material)
                                          │
Phase 4 (Finance) ─────────────► Phase 5 (Notifications & SMS delivery)
                                          │
                                          └─► Phase 7 (Audit auto-log, Portals, Backups)
```

Every phase closes with a security-linter run and a quick end-to-end smoke test so later phases start on a green baseline.

## Technical details

- Storage buckets to provision in Phase 2: `avatars` (public read, admin write), `study-material`, `question-papers`, `books-pdf` (signed URLs), `invoices` (signed).
- PDF generation: `jspdf` + `jspdf-autotable` server-side inside `createServerFn` handlers to keep the client bundle small.
- CSV parsing: `papaparse` client-side with a validation preview step before insert.
- Email: use Lovable Emails scaffolder (`scaffold_transactional_email_templates`) — no third-party keys.
- SMS: prefer Twilio via `standard_connectors--connect`; GatewayAPI as alt. Wire through the connector gateway from a server function.
- Realtime chat: single `messages` channel subscription keyed by conversation id; add `conversations` table.
- Audit auto-log: one PL/pgSQL trigger function `public.log_audit()` attached via `AFTER INSERT OR UPDATE OR DELETE` on every user-facing table.
- Role portals: reuse `AppShell`, gate at `_authenticated` layout with role-specific redirects (teacher → `/teacher`, student → `/student`, parent → `/parent`).

## Deliverable per phase

Each phase ends with:
- Database migrations for its new tables/triggers
- Route files under `/admin/*` and, in Phase 7, `/teacher/*` `/student/*` `/parent/*`
- Sidebar entries and any nav restructuring
- Short progress summary + what's next

Estimated size: ~30 sub-modules across 7 phases. Start with Phase 1 when ready.
