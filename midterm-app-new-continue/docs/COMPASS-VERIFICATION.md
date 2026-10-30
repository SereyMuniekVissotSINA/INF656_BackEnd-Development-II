# MongoDB Compass verification

This checklist is for the assignment's required desktop check.
It is not a claim that Compass was run automatically.

## Connect

1. Install/open [MongoDB Compass](https://www.mongodb.com/try/download/compass).
2. Start your local MongoDB service or run npm run db:start in the project.
3. If needed, run npm run seed and npm start in a second terminal.
4. In Compass, choose Add New Connection.
5. Enter mongodb://127.0.0.1:27017 and connect.
6. Open the mine_app database and the items collection.

The initial collection should contain at least five documents, each with an ObjectId
_id plus name, category and numeric price. It must not contain a custom numeric id.

## Verify each API operation

Import postman/mine-app-mongodb.postman_collection.json into Postman.
Use individual requests so you can inspect each intermediate state in Compass.

| API action | Expected response | Check in Compass |
| --- | --- | --- |
| GET /api/items | 200 with success, count and data | The returned documents exist in mine_app.items |
| GET /api/items/:id | 200 with one document | Filter by that _id and compare fields |
| POST /api/items | 201 with generated _id | Refresh and find the new API Test Headphones document |
| PATCH /api/items/:id | 200 with price 49.99 | Refresh: same _id/name/category, new price |
| DELETE /api/items/:id | 204 with an empty body | Refresh: the document is gone |
| GET /api/items/not-an-objectid | 400 | No collection changes |
| GET the deleted item's URL | 404 | Document remains absent |

A Compass filter for a document is:

```javascript
{ _id: ObjectId("PASTE_THE_RETURNED_24_CHARACTER_ID") }
```

Replace the placeholder before running the filter. You can also search for:

```javascript
{ name: "API Test Headphones" }
```

## Persistence check

Create a temporary item, stop and restart Express (leave MongoDB running), then GET
that item's _id again. Its saved fields should remain. Delete the temporary item
when finished. The seed command should not be rerun to demonstrate persistence.

If you use the bundled local MongoDB helper, Ctrl+C stops it without deleting
.local-mongodb; restarting the same helper reuses those WiredTiger files.

## Record evidence

If your instructor wants screenshots, capture the collection after the insert and
update and the empty filter result after deletion. Include the corresponding
Postman requests and responses. Avoid including connection credentials in captures.

Reference: [MongoDB Compass connection guide](https://www.mongodb.com/docs/compass/connect/)
and [filtering documents](https://www.mongodb.com/docs/compass/query/filter/).
