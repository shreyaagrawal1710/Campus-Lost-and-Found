# Campus Lost & Found: Frontend (React + Vite)

    npm install
    npm run dev        # http://localhost:5173, proxies /api to http://localhost:5000

Backend URL/port: edit `vite.config.js`. All API calls live in `src/api.js`.

## Field names the UI expects (agree these with Person 2 / Person 3)
- login/register response: `{ token, user: { id, name, email, role } }`
- item: `item_id, item_name, report_type, status, description, item_date, category_id, category_name, location_id, location_name, reporter_id, reporter_name`
- category: `category_id, category_name`; location: `location_id, location_name`
- GET /items extra query param `q` (text search) beside report_type, category_id, location_id, date_from, date_to, status
- POST /items/:id/claims body: `{ private_description }`
- my claim: `claim_id, item_id, item_name, item_status, status, created_at, admin_remarks`
- admin claim: `claim_id, item_id, item_name, category_name, location_name, claimant_name, claimant_email, private_description, status, created_at`; GET /admin/claims accepts `?status=`
- PATCH /admin/claims/:id body: `{ status: 'APPROVED' | 'REJECTED', remarks }`
- POST /admin/items/:id/return body: `{ remarks }`
- stats: `total_items, open_items, pending_claims, returned_items, unclaimed_found`
