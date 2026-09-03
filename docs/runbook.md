# PO MVP Runbook

Use this sequence to complete and validate the Purchase Order backlog. Do not implement Goods Receipt, bookmarks, dashboard expansion, or unrelated features.

## 1. Confirm The Backend Baseline

- [ ] Run `cd backend && npm test -- purchase-order-service.test.js`.
- [ ] Confirm PO creation, approved-PR enforcement, and over-allocation rejection pass.

**Checkpoint:** Do not change the UI until the focused PO service tests pass.

## 2. Complete Submit-Transition Tests

- [ ] Add focused tests for `DRAFT -> SUBMITTED` in `backend/tests/services/purchase-order-service.test.js`.
- [ ] Cover successful submission, missing PO handling, and rejection of non-draft POs.
- [ ] Keep business rules in the PO service and route handlers thin.

**Checkpoint:** Re-run the focused Jest command. The suite must cover input validation, approved PR lines, allocation limits, and PO submission.

## 3. Add The PO Frontend Contract

- [ ] Add PO API methods in `frontend/src/api.js`: list, create, detail, submit, and open lines.
- [ ] Add PO list, create, and detail routes in `frontend/src/router/index.js`.
- [ ] Add a Purchase Orders navigation link in `frontend/src/App.vue`.
- [ ] Follow existing requisition page layouts and CSS variables.

## 4. Implement PO Pages

- [ ] Create a PO list page with status, detail links, loading, and visible error states.
- [ ] Create a PO detail page that displays lines and allows submission only when the PO is `DRAFT`.
- [ ] Create a PO form that uses approved PR open lines and sends the existing create request.
- [ ] Treat server-side allocation validation as authoritative and render its errors clearly.

**Checkpoint:** With the database, backend, and Vite app running, verify PO navigation, loading, and API-error feedback manually.

## 5. Validate The PO Workflow

- [ ] Create a valid PO from seeded approved PR data.
- [ ] Open the PO detail and submit it.
- [ ] Confirm its status becomes `SUBMITTED` and the Submit action is no longer shown.
- [ ] Attempt to allocate more than the PR line's remaining quantity.
- [ ] Confirm the request fails clearly and does not create a PO.

## 6. Add E2E Coverage

- [ ] Create `tests/e2e/po.spec.js`.
- [ ] Cover PO navigation, successful creation, detail display, and submission.
- [ ] Cover the visible over-allocation error using seeded PR data.

## 7. Final Gate

- [ ] Run `cd backend && npm test`.
- [ ] Run `npx playwright test tests/e2e/po.spec.js`.
- [ ] Confirm the change set contains no GR implementation or unrelated feature work.
- [ ] Update `docs/plan.md` only when an intentional PO API or workflow contract changes.
- [ ] Record intentional limitations or deferred work in the relevant issue or documentation.
