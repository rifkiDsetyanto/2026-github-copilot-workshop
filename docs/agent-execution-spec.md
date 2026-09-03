# Agent Execution Specification: Procurement MVP Workshop

## 1. Purpose

This document is an executable specification for an agent working on the procurement MVP workshop repository.

The agent must complete the workshop backlog in the following order:

1. Verify the provided baseline.
2. Implement the Purchase Order (PO) backend.
3. Implement the PO frontend.
4. Add focused PO tests and run review checks.
5. Record Goods Receipt (GR) as further exploration only.

The agent must not implement the GR module as part of the required workshop backlog.

Reference requirements: `docs/plan.md`.

## 2. Fixed Constraints

- Backend: Fastify + JavaScript.
- API style: REST JSON.
- Database: PostgreSQL in Docker.
- Frontend: Vue 3 + Vite + JavaScript.
- Unit tests: Jest.
- End-to-end tests: Playwright.
- Do not introduce Prisma.
- Preserve the existing PR module and baseline behavior.
- Keep route handlers thin and put business rules in services.
- Keep files short and readable for workshop participants.
- Do not add SSO, workflow engines, reporting, notifications, advanced approval rules, or enterprise compliance features.
- Do not change the public API names already specified in `docs/plan.md`.
- Do not implement GR pages, GR routes, GR services, or GR posting in the required backlog.

## 3. Source-of-Truth Files

Before editing, inspect these files:

- `AGENTS.md`
- `docs/plan.md`
- `db/migrations/001_init_procurement_mvp.sql`
- `db/seeds/002_seed_procurement_mvp.sql`
- `backend/src/app.js`
- `backend/src/routes/requisition-routes.js`
- `backend/src/services/requisition-service.js`
- `frontend/src/router/index.js`
- `frontend/src/App.vue`
- `frontend/src/api.js`
- Existing PO files and tests, when present.

The database schema is the source of truth for table and column names. Existing PR implementation is the source of truth for local API, error, routing, and UI conventions.

## 4. Execution Protocol

For every task:

1. Read the directly related existing files.
2. State a short hypothesis about the code path to change.
3. Make the smallest change that tests the hypothesis.
4. Run the narrowest relevant validation immediately.
5. Fix failures in the same scope before moving to the next task.
6. Do not rewrite unrelated code.
7. Report changed files, validation command, result, and remaining risk.

The agent must stop and report a blocker when a required baseline assumption is false, the database cannot be started, or a change would violate the fixed constraints.

## 5. Phase 0: Baseline Verification

### Goal
Confirm that the repository can run before the PO implementation starts.

### Tasks

- Inspect the repository and graph metadata for the relevant `backend/` and `frontend/src/` nodes.
- Start the PostgreSQL service using the documented Docker Compose flow.
- Install dependencies only when required by the existing package manifests.
- Start the backend and frontend using their existing scripts.
- Verify that the dashboard and PR pages are reachable.
- Run the existing backend tests and frontend tests.

### Exit criteria

- PostgreSQL is reachable.
- Backend starts without new errors.
- Frontend starts without new errors.
- Existing PR behavior remains available.
- Any pre-existing failure is recorded before PO edits.

## 6. Phase 1: PO Backend API

### Goal
Implement the required PO REST API while preserving the existing conventions.

### Required endpoints

- `POST /api/purchase-orders`
- `POST /api/purchase-orders/:id/submit`
- `GET /api/purchase-orders/:id`
- `GET /api/purchase-orders/:id/open-lines`

A PO list endpoint may be added only when required by the existing frontend flow or `docs/plan.md`.

### Create rules

`POST /api/purchase-orders` must:

- Require a non-empty `vendorName`.
- Require at least one line.
- Require valid `prLineId`, item fields, UOM, site code, and positive `qtyOrdered`.
- Accept only PR lines belonging to an `APPROVED` requisition.
- Reject allocation quantities greater than the PR line remaining quantity.
- Create the PO, PO lines, and allocation rows in one transaction.
- Atomically update `pr_lines.qty_allocated`.
- Roll back all writes when any line fails validation.
- Return a clear JSON error with an appropriate 4xx status for invalid input.

### Submit rules

`POST /api/purchase-orders/:id/submit` must:

- Return not found for an unknown PO.
- Allow only `DRAFT -> SUBMITTED`.
- Reject submitting a PO that is already `SUBMITTED`.
- Update `updated_at`.
- Return the updated PO detail.

### Open-line rules

`GET /api/purchase-orders/:id/open-lines` must:

- Return the PO summary.
- Return only lines where `qty_ordered - qty_received > 0`.
- Include enough line data for a future GR form.
- Return not found for an unknown PO.

### Backend exit criteria

- All four required endpoints are registered and reachable.
- PO business rules live in a service module.
- Route handlers remain thin.
- Concurrent PO creation cannot over-allocate a PR line because the relevant row is locked inside the transaction.
- Existing PR endpoints and tests still pass.

## 7. Phase 2: PO Frontend

### Goal
Build the PO workflow using the existing Vue patterns.

### Required screens

- PO list page, if required by the existing navigation.
- PO create page.
- PO detail page.

### Required user journey

1. Open an approved PR.
2. Select one or more open PR lines.
3. Enter vendor and allocation quantities.
4. Create a draft PO.
5. Open PO detail.
6. Submit the PO.
7. Confirm the status changes to `SUBMITTED`.
8. Confirm the PO line quantities and source PR allocation are visible.

### UI rules

- Reuse existing CSS variables, layout, typography, and navigation patterns.
- Disable actions that are invalid for the current status.
- Show loading, empty, validation-error, and API-error states.
- Do not trust client-side validation as a replacement for backend validation.
- Do not add GR navigation or screens during this phase.

### Frontend exit criteria

- PO pages are reachable from existing navigation.
- A user can create and submit a PO from approved PR data.
- Invalid quantities are clearly rejected.
- The UI does not break existing PR pages.
- No visible UI text uses emojis.

## 8. Phase 3: Focused Testing

### Jest requirements

Add or update service-level tests for:

- Successful PO creation from an approved PR line.
- Rejection of over-allocation.
- Rejection of allocation from a non-approved PR.
- Rejection of an invalid PO status transition.
- Transaction rollback when a later PO line fails.
- Open PO lines excluding fully allocated-for-receipt lines, when applicable.

Tests must follow the existing Jest setup and mocking style.

### Playwright requirements

Add one focused end-to-end flow:

1. Use baseline PR data.
2. Create or open an approved PR.
3. Create a PO from an open PR line.
4. Submit the PO.
5. Assert PO detail, status, vendor, and quantity values.

The test must not depend on a previously created PO unless the existing test setup explicitly provides deterministic seed data.

### Exit criteria

- Focused Jest tests pass.
- Focused Playwright test passes when the required services are running.
- Existing tests are not weakened or deleted.
- Failures caused by environment setup are distinguished from code failures.

## 9. Phase 4: Review and Completion

### Review checklist

- Confirm the API paths match `docs/plan.md`.
- Confirm PR data is not mutated outside the intended PO allocation behavior.
- Confirm all multi-table PO writes use a transaction.
- Confirm invalid status transitions return clear errors.
- Confirm no GR implementation was added to the required backlog.
- Check changed files for unrelated formatting or dependency churn.
- Run the available lint, test, and build commands from the package manifests.

### Workshop completion criteria

The workshop backlog is complete only when:

- The baseline runs.
- PO list/create/detail behavior is implemented as required.
- Required PO APIs work.
- Allocation validation is enforced.
- Jest has meaningful PO coverage.
- Playwright covers the PO journey.
- Existing PR behavior remains intact.
- GR is explicitly recorded as future exploration, not marked as implemented.

## 10. GR Further Exploration Boundary

After all workshop completion criteria pass, the agent may produce a separate proposal for GR. It must not silently implement GR during the PO backlog.

A future GR proposal may cover, in this order:

1. `POST /api/goods-receipts` to create a draft from submitted PO open lines.
2. `GET /api/goods-receipts/:id` for detail.
3. `POST /api/goods-receipts/:id/post` with transactional quantity updates.
4. Validation that received quantity does not exceed PO open quantity.
5. Jest tests for over-receipt and duplicate posting.
6. Playwright coverage for PO submitted -> GR created -> GR posted.

The GR proposal must preserve the existing schema and must define how `po_lines.qty_received` and `pr_lines.qty_received` are updated before implementation begins.

## 11. Agent Final Report Format

At the end of execution, report:

- Completed phases.
- Files changed.
- API endpoints implemented.
- Tests and commands run.
- Validation results.
- Known pre-existing failures.
- Remaining GR exploration work.
