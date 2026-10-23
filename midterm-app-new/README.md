# Midterm App

A complete Express.js application with a static homepage and an in-memory items API.
Requires Node.js 22 or newer.

## Install and run

Open a terminal inside this folder:

```sh
npm install
npm start
```

On Windows PowerShell, use `npm.cmd install` and `npm.cmd start` if script execution
policy prevents the `npm.ps1` wrapper from running.

Open **http://localhost:3000**. The homepage displays **Welcome to the Midterm App**,
with a CSS stylesheet and a local SVG image.

The server uses `process.env.PORT` when set, otherwise port 3000. For example, in
PowerShell:

```powershell
$env:PORT = "3001"
npm.cmd start
```

Optional commands:

- `npm run dev`: runs Node's built-in watch mode and restarts after source changes.
- `npm test`: runs HTTP integration tests using Node's built-in test runner.

## Project structure

```text
midterm-app-new/
  app.js                       Express configuration and middleware order
  server.js                    Starts the server
  package.json
  package-lock.json
  controllers/
    itemController.js          CRUD operations and field validation
  data/
    items.json                 Five starting items, loaded once at startup
  middleware/
    requestLogger.js           Logs timestamp, HTTP method and URL
    errorHandler.js            Logs application errors and sends JSON errors
  routes/
    itemRoutes.js              Express Router mounted at /api/items
  logs/                        requests.txt and error.txt are created at runtime
  public/
    index.html                 Homepage
    style.css                  Responsive styling
    images/items.svg           Local illustration displayed on homepage
  postman/
    midterm-app.postman_collection.json
  screenshots/                 Supplied Thunder Client reference captures
  test/
    app.test.js                HTTP integration tests
```

## API endpoints

All API responses use JSON except successful DELETE responses, which have no body.
For POST and PATCH, select **Body > raw > JSON** in Postman, or **Body > JSON** in
Thunder Client, and send `Content-Type: application/json`.

| Method | Path | Operation | Success |
| --- | --- | --- | --- |
| GET | /api/items | List all items with success, count and data | 200 |
| GET | /api/items/:id | Get one item by numeric ID | 200 |
| POST | /api/items | Create an item with an automatically generated numeric ID | 201 |
| PATCH | /api/items/:id | Update only the fields supplied | 200 |
| DELETE | /api/items/:id | Delete an item; return an empty response | 204 |

GET one, PATCH and DELETE return **404** if the item does not exist.
Unknown routes also return **404** with a message such as:

```json
{ "success": false, "message": "Route not found: GET /api/does-not-exist" }
```

POST requires a non-empty string `name`, a non-empty string `category`, and a finite,
non-negative numeric `price`. PATCH accepts one or more of these fields.
Invalid fields or malformed JSON return **400**. Client-supplied IDs and unknown
fields are rejected. Updates validate the full request before changing any field.

Example POST body:

```json
{ "name": "Headphones", "category": "Electronics", "price": 59.99 }
```

Example response (on a fresh server):

```json
{
  "success": true,
  "data": { "id": 6, "name": "Headphones", "category": "Electronics", "price": 59.99 }
}
```

Example PATCH body for `/api/items/6`:

```json
{ "price": 49.99 }
```

Changes remain in memory. Restarting the server reloads `data/items.json` and resets
the items. CRUD operations never rewrite the JSON file.

## Middleware and errors

`app.js` registers middleware in this order: request logger, `express.json()`,
static assets, API routes, fallback 404 handler, global error handler.

The logger records every incoming request in `logs/requests.txt` before continuing,
including malformed JSON and requests for static assets. Log paths are resolved
relative to the project, so they work regardless of the terminal's current folder.

The global error handler writes error details to `logs/error.txt`, preserves valid
4xx/5xx error statuses, and returns a JSON error. Unexpected failures return 500 with
`Internal Server Error`; the stack trace stays in the error log. An unmatched route
is handled separately by the 404 fallback.

## API testing and screenshots

Import `postman/midterm-app.postman_collection.json` into Postman, start the server,
and send the six requests in order. The collection uses `baseUrl` (default
`http://localhost:3000`) and saves the POST response ID as `createdItemId` for PATCH
and DELETE. Restart the server before testing if you want the original five items.

The supplied Thunder Client screenshots from the existing course project are
included as **reference captures**, rather than fresh captures of this new folder.
They demonstrate the same required URLs, status codes and JSON response structure:

| Scenario | Reference capture |
| --- | --- |
| GET all items | [1-get-all.png](screenshots/1-get-all.png) |
| GET one item | [2-get-one.png](screenshots/2-get-one.png) |
| POST new item | [3-post.png](screenshots/3-post.png) |
| PATCH existing item | [4-patch.png](screenshots/4-patch.png) |
| DELETE item | [6-delete.png](screenshots/6-delete.png) |
| Invalid route, 404 | [7-errors.png](screenshots/7-errors.png) |

For fresh submission screenshots, capture the six Postman responses after running
the included collection. Each capture should show method, URL, status and response
body where applicable; DELETE should show 204 with an empty body.

`npm test` verifies this implementation over HTTP: static assets, all CRUD
operations, partial updates, input validation, missing items, invalid routes,
malformed JSON, request/error logs, unexpected 500 errors, unique IDs after deletion,
and unchanged seed data.
