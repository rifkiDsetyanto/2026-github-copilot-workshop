# Project Progress

## Current Scope

This repository is a procurement MVP workshop. Purchase Requisition (PR) is the working baseline, Purchase Order (PO) is the active implementation area, and Goods Receipt (GR) remains deferred exploration.

## Implemented

### Platform And Database

- PostgreSQL Docker bootstrap with migration and seeded sample data.
- Database tables for PR, PO, PR-to-PO allocations, and GR workflows.
- Fastify JavaScript backend with PostgreSQL, CORS, Swagger UI at `/api-docs`, and OpenAPI JSON at `/api-docs/json`.
- Vue 3 + Vite frontend with shared Figma-derived CSS tokens and application navigation.

### Purchase Requisition

- PR list, create, and detail pages.
- PR REST endpoints for list, create, detail, open lines, submit, and approve.
- PR lifecycle: `DRAFT -> SUBMITTED -> APPROVED`.
- Service tests for list mapping, detail mapping, and open-line filtering.

### Purchase Order Backend

 PO list route at `/purchase-orders` and detail route at `/purchase-orders/:id`.
 PO Create route at `/purchase-orders/new`.
 PO list loads records through `api.listPurchaseOrders` and links each row to detail.
 PO detail loads header and lines through `api.getPurchaseOrder`, shows PR allocation sources, and supports submitting drafts through `api.submitPurchaseOrder`.
 PO Create loads approved PR open lines and creates drafts through the existing API client.
 Local quantity and unit-price editing, line selection, line removal, calculated total, validation feedback, and clear server error messages.
 The PO list and detail pages are connected to the corresponding backend endpoints. GR remains outside the frontend scope.
 Backend: 27 Jest tests pass, including PO validation, allocation limits, status transitions, list mapping, open-line filtering, and requisition service mapping.
 Frontend: 8 Vitest tests pass for PO page rendering, API payload wiring, header form events, allocation table events, empty state, over-allocation validation, and server error rendering.

- PO Create route at `/purchase-orders/new`.
## Remaining PO Work

 Add Playwright coverage for PO list, creation, detail, submission, and visible over-allocation errors.
 Add a dedicated frontend test file for PO list and detail page rendering if broader component coverage is needed.

## PO API Endpoints

These routes are registered by `backend/src/routes/purchase-order-routes.js` and delegate to the PO service.

| Method | Endpoint | Current behavior |
| --- | --- | --- |
| `GET` | `/api/purchase-orders` | Returns `{ items }` containing PO headers ordered newest first. |
| `POST` | `/api/purchase-orders` | Creates a `DRAFT` PO from one or more approved PR lines and returns the created PO with details. |
| `POST` | `/api/purchase-orders/:id/submit` | Changes a `DRAFT` PO to `SUBMITTED` and returns the updated PO. |
| `GET` | `/api/purchase-orders/:id` | Returns a PO header, ordered lines, and each line's PR allocation sources. |
| `GET` | `/api/purchase-orders/:id/open-lines` | Returns the PO summary and lines where `qtyOrdered - qtyReceived > 0`. |

PO-specific response behavior:

- Missing PO IDs return `404` with `{ message: "Purchase order not found" }`.
- Invalid payloads, over-allocation, non-approved PR sources, and invalid status transitions return `422` with an error message.
- Unexpected backend errors are handled by Fastify's `500` error handler.

## Current Frontend Routes

- `/` - dashboard.
- `/requisitions` - PR list.
- `/requisitions/new` - PR create.
- `/requisitions/:id` - PR detail.
- `/purchase-orders/new` - PO create.

PO list and PO detail frontend pages are not implemented yet, despite their backend endpoints being available.

## Tests And Verification

- Backend: 27 Jest tests pass, including PO validation, allocation limits, status transitions, list mapping, open-line filtering, and requisition service mapping.
- Frontend: 6 Vitest tests pass for PO page rendering, header form events, allocation table events, empty state, and page validations.
- Frontend production build passes with `npm run build` from `frontend`.
- The backend `npm test` script uses POSIX inline environment-variable syntax and does not run directly in Windows PowerShell; Jest runs successfully with PowerShell-compatible `NODE_OPTIONS` setup.

## Remaining PO Work

- Add PO list and detail frontend pages and routes.
- Connect the PO Create page to the existing API client.
- Add PO detail submit interaction.
- Add Playwright coverage for PO creation, submission, and visible over-allocation errors.

## Explicitly Deferred

- GR routes, services, screens, and validations.
- Bookmark feature.
- Vendor master data, PO dashboard metrics, reporting, notifications, and enterprise workflow features.
