# Marvet

Marvet is an existing MERN e-commerce demo with a React/Vite single-page frontend and an Express/Mongoose backend. It includes email/password and optional Google sign-in, catalog and category management, local browser cart/favorites, demo checkout, reviews, email notifications, an admin dashboard, maps, and a Gemini-powered store assistant.

## Requirements

- Node.js 20.19 or newer
- npm
- MongoDB. Checkout and order cancellation require a replica set or sharded cluster because they use transactions.

## Install and run

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Configure `backend/.env` locally. Start from `backend/.env.example` only if a local file does not already exist. Never commit or share the local file.
3. Start the backend from `backend`:

   ```bash
   npm run dev
   ```

4. In a separate terminal, install and start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open the Vite URL printed in the frontend terminal. The backend defaults to port 5000; set `PORT` to use another port and configure `VITE_API_BASE_URL` to match.

For production frontend assets, run `npm run build` in `frontend`. The backend start command is `npm start` in `backend`.

## MongoDB and demo checkout

Set `DATABASE_URI` to a development database you control. A standalone MongoDB server does not support the multi-document transactions used for checkout and cancellation. Use MongoDB Atlas or configure local MongoDB as a replica set; initialize the local replica set before running the API. When transactions are unavailable, checkout and cancellation intentionally fail rather than risk partial stock or order updates.

Checkout is a demo order flow only. It does not collect card details or process real payments. The cart and favorites are kept in browser localStorage, scoped to the guest or signed-in user's ID; they are not synchronized to the database.

## Environment configuration

Copy the example files without overwriting existing local configuration:

- Backend: `backend/.env.example` → `backend/.env`
- Frontend: `frontend/.env.example` → `frontend/.env.local`

The backend uses these variable names:

- Required: `DATABASE_URI`, `SECRET`
- Optional Google sign-in: `GOOGLE_CLIENT_ID` (the same public client ID is configured as `VITE_GOOGLE_CLIENT_ID`)
- Optional Gemini assistant: `GEMINI_API_KEY`, `GEMINI_MODEL`
- Optional email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- Optional runtime/development: `PORT`, `NODE_ENV`
- Production browser access: `CLIENT_ORIGINS` (comma-separated exact frontend origins; set this before deploying)

The frontend uses `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, and `VITE_GOOGLE_MAPS_API_KEY` as needed. Vite variables are visible to browser users: never put Gemini keys, JWT secrets, SMTP credentials, or other server secrets in a `VITE_` variable.

## Optional integrations

### Google sign-in

Create a Google OAuth web client. Configure the development and production JavaScript origins in its consent/client settings. Set its client ID in both `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend). The backend verifies the ID token audience and verified email before linking or creating a user. An existing account with the same verified email is linked rather than duplicated. Email/password login remains available.

### Maps and location

Enable the Google Maps JavaScript API and configure a browser key in `VITE_GOOGLE_MAPS_API_KEY`. Restrict the key to the required website referrers and API. Location permission is requested only after the customer presses the optional location button in the cart. Coordinates stay in page memory and are not submitted with the order. Without a maps key, the page offers an explicit Google Maps link after the customer chooses to share their location.

### Gemini store assistant

Set `GEMINI_API_KEY` only in the backend environment. `GEMINI_MODEL` optionally selects an available Gemini text model. The frontend calls the backend assistant endpoint; the API key is never sent to the browser. The assistant receives a limited snapshot of catalog data, has no order lookup access, validates message length/history, and has a basic in-memory per-process rate limit. Use a shared rate-limit store if deploying multiple backend instances. Gemini responses are informational, not order or payment actions.

### Email

SMTP configuration is optional. Welcome and order confirmation emails are best-effort; email delivery does not determine whether an account or order is created.

## Sample data and admin account

Seed products and categories in a development database only:

```bash
cd backend
NODE_ENV=development npm run seed
```

The seed is additive and idempotent: existing categories/products with the sample names are left unchanged. It creates no users, passwords, or administrator accounts. To create an admin in a development database, register a normal account, select the same development database in an authorized `mongosh` session, and promote only that account:

```javascript
db.users.updateOne(
  { email: "<registered-account-email>" },
  { $set: { role: "admin" } }
)
```

Do not add a default admin password or expose the account to a public database.

Admin analytics are served by an authenticated, admin-authorized API and use actual order and product records. Empty datasets display an empty state rather than invented statistics.

## Postman

Import `postman/Marvet_API_Tests.postman_collection.json` and `postman/Marvet_Local.postman_environment.json`. See `postman/README.md` for test order, local environment setup, optional admin/Gemini scenarios, and cleanup notes. The collection does not contain production credentials. Live API tests require a running backend and database; atomic order tests require transaction support.

## Security notes

- Never commit `.env` files or real credentials. The backend environment file has previously been tracked by Git; remove it from repository tracking and rotate any credentials that may have been exposed. Keep the local file out of exported archives and source control.
- Google Maps browser keys and Google OAuth client IDs are public identifiers, not server secrets. Restrict the Maps key by referrer and API.
- Set a unique, high-entropy `SECRET` locally and keep it only on the backend.
- There is no real payment gateway, card collection, or card data storage.

## Validation

Run backend JavaScript syntax checks with `node --check` on the backend source files. Run the frontend production build with `npm run build` and lint with `npm run lint` from `frontend`. The backend package currently has no automated test suite configured. External Google, Gemini, SMTP, MongoDB, and browser-location integrations require local credentials/infrastructure and must be tested separately.
