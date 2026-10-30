# MongoDB verification results

Verification date: October 29, 2026.

## Completed checks

- Updated the existing Mine App project in midterm-app-new.
- Local MongoDB Community 8.2.6 running at mongodb://127.0.0.1:27017.
- Database mine_app, collection items, five initial documents.
- Direct database inspection confirmed ObjectId _id fields, string name/category,
  numeric price, and no custom numeric id field.
- npm test: 18 tests passed, 0 failed.
- npm run test:api: 8 Postman requests, 17 assertions, 0 failures.
- Postman responses: GET all/one 200, POST 201, PATCH 200, DELETE 204 with no
  response body, invalid ObjectId 400, missing/deleted item 404, invalid route 404.
- Insert/update/delete were verified directly against MongoDB in integration tests.
- A separate Express process read previously saved changes.
- A failed MongoDB startup did not create an HTTP listener or print credentials.
- Environment files, runtime logs, dependencies, downloaded binaries and local
  database files are excluded from the submission.

- Verified the app connects to Atlas database min-app and returns its five items.
- Occupied HTTP ports produce a clear EADDRINUSE message rather than a null-address crash.

## Remaining manual requirement

MongoDB Compass was not found installed, and no desktop automation interface is
available in this session. Compass visual verification has not been performed.
Use docs/COMPASS-VERIFICATION.md to connect and verify each change in the GUI.
The Postman collection is ready to import for those individual requests.

Historical screenshots from the midterm use numeric IDs and are not evidence of
the MongoDB version. No new Compass or GUI Postman screenshots have been fabricated.
