# Marvet Postman assets

This folder stores the backend route smoke tests for the Marvet demo store.

## Files

- `Marvet_API_Tests.postman_collection.json` — request collection for auth, products, categories, reviews, orders, admin analytics, and the chatbot.
- `Marvet_Local.postman_environment.json` — local variable file for `baseUrl` and auth tokens.

## Import and use

1. Start the backend locally with a working MongoDB connection and your local `backend/.env` values.
2. In Postman, import the collection and environment files from this folder.
3. Select the `Marvet Local` environment and set the values for `baseUrl`, `token`, `adminToken`, `userId`, `productId`, `categoryId`, and `orderId` as you exercise the API.
4. For Google sign-in, provide a real Google ID token in `googleIdToken` only when testing that flow.

## Suggested testing order

1. Register a normal customer user.
2. Log in as the customer to populate `token` and `userId`.
3. Create or fetch a category to populate `categoryId`.
4. Create or fetch a product to populate `productId`.
5. Add a review for the product.
6. Create an order to populate `orderId`.
7. Fetch `My Orders` and then cancel the order.
8. Log in as an admin user and test admin-only routes such as user listings and analytics.
9. Test the Gemini assistant route with a small valid message.

## Notes

- These requests are template-based and intentionally do not include real credentials or secrets. The collection includes write requests (registration, catalog/review/order changes, and cancellation); do not run the full collection against a shared or valuable database. Review each request and use only a dedicated disposable local database.
- Live API testing requires a running backend and a database that supports atomic transactions for checkout and cancellation.
- If the database is not configured for replica-set transactions, order creation and cancellation should return a 503 response instead of completing a write.
- The collection is a smoke-test template, not safe to run wholesale against a shared or valuable database; it is not a substitute for production validation or a stored database dump.
