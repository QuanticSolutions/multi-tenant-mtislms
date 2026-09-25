# Multi-tenant SaaS conversion

Turn the single-school app into many isolated schools on one database, each at `<school>.<root-domain>`, with public registration and a resumable onboarding wizard.

## Phase 1 — Database (one migration, safe order)
1. Create `tenants` (subdomain unique + lowercase/url-safe check, display_name, status trial|active|suspended, plan, owner_user_id, onboarding_completed_steps jsonb default `[]`, onboarding_dismissed bool, created_at). Grants + RLS.
2. Insert one `default` tenant (subdomain `default`, status active, onboarding marked complete) for the existing school.
3. Add nullable `tenant_id` to **every** school-scoped table (all ~55 current tables: settings, profiles, user_roles, roles, role_permissions, students, teachers, parents, classes, subjects, departments, fees/challans/invoices/payments, payroll, library, inventory, transport, drivers, events, exams, homework, attendance, messaging, notifications, admissions, employment, donations, finance entries, grading, import profiles, audit logs, etc.). `login_attempts` stays global.
4. Backfill all rows to the default tenant, then set NOT NULL, add index, and default `tenant_id` to `current_tenant_id()` so existing inserts keep working without code changes.
5. Unique constraints become per-tenant (e.g. admission_no, employee_no, invoice_no, school_settings singleton → unique tenant_id, role names, subdomain).
6. `current_tenant_id()` SECURITY DEFINER helper reading the caller's profile.
7. Drop and recreate every RLS policy with `tenant_id = current_tenant_id()` added to USING and WITH CHECK, keeping existing role/permission logic. `has_role`, `can_edit_settings` also become tenant-aware.
8. Triggers/functions (`handle_new_user`, invoice totals, book issues, inventory, `merge_staff_import`) updated so "first user becomes admin" is per tenant and cross-table writes stay in-tenant.
9. Public, safe read: `get_tenant_public(subdomain)` function returning only name, logo, colors, tagline, status — no direct anon table access.
10. Embed forms (admissions/donations/staff applications): anon inserts must carry a tenant resolved server-side from the subdomain via that function, validated in a server function.

## Phase 2 — Subdomain resolution
- `useTenantSubdomain()`: parses hostname against a configured root domain; root/preview/localhost → marketing mode (with `?tenant=` override for preview testing only, never used for data access).
- Pre-login branding on sign-in page comes from the public tenant lookup.
- "School not found" page with link to registration.
- After login: compare user's tenant subdomain to current host; redirect to the correct subdomain if different.

## Phase 3 — Registration (`/register`, public)
- School name, subdomain with live format + availability check, admin name/email/password.
- Server function: creates auth user, tenant (trial), profile with tenant_id, admin role, default school_settings, default roles + full permissions — all through data, no deploy. Rolls back on failure.
- Redirects to `https://<subdomain>.<root>/onboarding`.
- Root landing page gets "Register your school" CTA.

## Phase 4 — Onboarding wizard (`/onboarding`)
Steps saved to `onboarding_completed_steps`, each skippable, resumable:
0. Welcome/tour (one line per main tab) + "Skip setup" (marks dismissed).
1. School Profile & Branding — reuses the existing settings form.
2. Import — reuses Import wizard, pre-scoped to Students, Teachers, Parents, Classes; skippable.
3. Fees & Payroll — explained links to Fee Groups/Constituents and Departments/Payroll.
4. Invite team — email + role, via existing user management (invite scoped to the tenant).
5. Done — marks complete, link to dashboard.
- Dashboard "Setup Checklist" widget (collapsible) while incomplete; "Resume setup" link in Settings.

## Phase 5 — App code sweep
- Remove every single-row assumption (e.g. school_settings `.eq("singleton", true)` → rely on RLS returning the user's one row; upserts use tenant_id).
- Server functions using the admin client (user management, imports, cron, login guard) must scope explicitly by the caller's tenant_id.
- Branding hook reads the tenant's settings row.

## Infrastructure you must set up (outside the app)
- Wildcard DNS `*.yourdomain.com` and wildcard route/certificate on your Cloudflare Workers deployment. I cannot configure this from here.
- Tell me your real root domain (placeholder `ourapp.com` will be a single config value).

## Technical notes
- Very large migration; runs as one transaction so there is never a moment where data has no tenant.
- Verification: create a second tenant via /register, confirm it sees none of the default tenant's data, and the default tenant still works unchanged.
- Delivered in phases; the database phase comes first because everything depends on it.
