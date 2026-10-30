# Mine App - MongoDB continuation

This is the existing Express midterm application, updated to store items in MongoDB.
The same app.js, routes, controllers, request logger, 404 fallback and global error
handler remain. The JSON-backed array and numeric IDs have been removed.

## Requirements

- Node.js 22 or newer and npm.
- A local MongoDB server, or MongoDB Atlas.
- MongoDB Compass for the assignment's visual database verification.

## Install and configure

Open a terminal in this existing project folder:

```powershell
npm.cmd install
Copy-Item .env.example .env
```

If you already have a .env file, edit it instead of overwriting it. On macOS/Linux,
use npm install and cp .env.example .env.

The example selects the local database without a username or password:

```dotenv
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@midterm.ccs0o8i.mongodb.net/
MONGODB_DB=mine_app
PORT=3000
LOCAL_MONGODB_PORT=27017
```

The connection information is read from environment variables; .env is loaded
relative to the project directory. Environment variables take priority over .env.
For Atlas, put your own connection URI in .env and choose your database using
MONGODB_DB. The .env file is ignored by Git and excluded from the submission.
Never put actual credentials in JavaScript, screenshots or the example file.

## Start local MongoDB

If MongoDB is already installed and running locally, use that server and skip this
command. Otherwise run the included development helper in a separate terminal:

```powershell
npm.cmd run db:start
```

The helper downloads and launches a real MongoDB Community mongod executable.
The first run downloads the binary; later runs reuse .cache/mongodb.
It listens only on 127.0.0.1:27017 and uses WiredTiger files in .local-mongodb.
Despite the helper dependency's name (mongodb-memory-server-core), this development
instance saves data on disk and does not delete it when stopped with Ctrl+C.
Keep the database terminal open while using the app. If port 27017 is occupied,
use the existing MongoDB service or set both LOCAL_MONGODB_PORT and MONGODB_URI to
an available port. The helper is intended for local development.

## Create five documents and start Express

With MongoDB running, use a second terminal:

```powershell
npm.cmd run seed
npm.cmd start
```

The seed command creates mine_app.items by inserting five documents with name,
category and price. MongoDB supplies each ObjectId _id. Seeding skips a nonempty
collection; it never deletes existing documents or adds duplicates on repeat runs.

Open http://localhost:3000. Express starts listening only after MongoDB connects
and responds to ping. A failed database connection produces a safe startup message
and exits without creating an HTTP listener. Stopping/restarting Express does not
reset the collection. Seeding is explicit, not automatic on app startup.

## Commands

| Command | Purpose |
| --- | --- |
| npm start | Connect to MongoDB, then start Express |
| npm run dev | Run Express with Node's file-watch mode |
| npm run db:start | Start the optional persistent local MongoDB helper |
| npm run seed | Insert the five sample documents if items is empty |
| npm test | Run integration tests against a separate real MongoDB process |
| npm run test:api | Run the included Postman collection with Newman against the running app |

Use npm.cmd in Windows PowerShell if execution policy blocks npm.ps1.

## Project structure

```text
app.js                         Existing Express setup and middleware order
server.js                      Connect first, then listen; close on shutdown
config/database.js             MongoDB connection, database and items collection
config/localMongo.js           Local development/test binary settings
controllers/itemController.js  Async MongoDB CRUD and request validation
routes/itemRoutes.js           Existing five routes under /api/items
middleware/requestLogger.js    Existing timestamp/method/URL logging
middleware/errorHandler.js     Existing global JSON error handling
data/seedItems.js               Five initial documents, with no IDs
data/seedCollection.js          Non-destructive seeding helper
scripts/seed.js                 Standalone seed command
scripts/local-mongodb.js       Optional persistent local mongod process
public/                        Existing homepage, CSS and image
logs/                          Runtime request/error logs
postman/                       MongoDB API collection
test/app.test.js               Real database and HTTP integration tests
docs/COMPASS-VERIFICATION.md    Required manual Compass checks
.env.example                   Safe environment template
```

There is no data/items.json. Seed data is used only by the seed command and tests;
normal CRUD requests read and write the MongoDB items collection.

## REST API

The base path remains /api/items. Send Content-Type: application/json for POST
and PATCH. Responses use success and data; GET all also includes count.

| Method | Path | Result |
| --- | --- | --- |
| GET | /api/items | 200: all documents with success, count and data |
| GET | /api/items/:id | 200: the matching MongoDB document |
| POST | /api/items | 201: the newly inserted document and generated _id |
| PATCH | /api/items/:id | 200: the document after updating supplied fields |
| DELETE | /api/items/:id | 204: no response body |

Use the 24-character _id returned by MongoDB in item URLs. Old numeric IDs such as
/api/items/2 are invalid. Examples:

```json
{ "name": "Headphones", "category": "Electronics", "price": 59.99 }
```

A POST response has this shape (the _id differs for every inserted document):

```json
{
  "success": true,
  "data": {
    "name": "Headphones",
    "category": "Electronics",
    "price": 59.99,
    "_id": "507f1f77bcf86cd799439011"
  }
}
```

PATCH accepts only the fields to change:

```json
{ "price": 49.99 }
```

Name and category must be nonempty strings. Price must be a finite, non-negative
number. POST requires all three; PATCH requires at least one. The full body is
validated before a write, so invalid updates do not partially change a document.
Neither _id nor legacy id can be supplied or changed. Unknown fields and MongoDB
update operators in request bodies are rejected.

- Invalid ObjectId: 400 with a clear JSON message.
- Well-formed ObjectId with no matching document: 404.
- Invalid JSON or invalid item fields: 400.
- Unknown route: 404 from the existing fallback.
- Unexpected database/application failure: 500; details stay in logs/error.txt.

## Postman and Thunder Client

Import postman/mine-app-mongodb.postman_collection.json into Postman and send the
eight requests in order. The collection defaults to http://localhost:3000 and
captures sampleItemId and createdItemId from real responses. It tests GET all,
GET one, POST, PATCH, DELETE, invalid ObjectId, a deleted/missing document and the
404 route fallback.

The same collection can run locally through npm run test:api (no Postman login
required). It creates one temporary API-test item, changes its price and deletes
that same item. Existing seeded items are not modified.

For Thunder Client, create the equivalent requests and copy a returned _id into
the GET/PATCH/DELETE URLs. The screenshots retained in screenshots/ are historical
midterm captures using numeric IDs; they do not verify the MongoDB version.

## MongoDB Compass

See [the Compass verification checklist](docs/COMPASS-VERIFICATION.md).
Connect to mongodb://127.0.0.1:27017 and open mine_app > items.
Run POST, PATCH and DELETE individually in Postman and refresh Compass after each
request. Compass itself is a separate desktop application; installing dependencies
does not install it. Do not treat automated driver checks as Compass screenshots.
