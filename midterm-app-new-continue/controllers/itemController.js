const { ObjectId } = require('mongodb');
const { getItemsCollection } = require('../config/database');

function parseId(req, res) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid MongoDB ID: use a 24-character hexadecimal _id'
    });
    return null;
  }
  return new ObjectId(req.params.id);
}

function itemNotFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Item with _id ${req.params.id} not found`
  });
}

// Validate the whole request before writing to MongoDB.
function validateFields(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Please send a JSON object with item fields';
  }
  const fields = ['name', 'category', 'price'];
  if (Object.keys(body).some((key) => !fields.includes(key))) {
    return 'Only name, category and price may be supplied; _id is generated automatically and cannot be changed';
  }
  if (partial && Object.keys(body).length === 0) {
    return 'Please provide at least one field to update';
  }
  for (const field of ['name', 'category']) {
    if ((!partial || Object.hasOwn(body, field)) &&
        (typeof body[field] !== 'string' || body[field].trim() === '')) {
      return `${field} must be a non-empty string`;
    }
  }
  if ((!partial || Object.hasOwn(body, 'price')) &&
      (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    return 'price must be a finite, non-negative number';
  }
  return null;
}

// Express 5 forwards rejected async controllers to the global error handler.
async function getAllItems(req, res) {
  const items = await getItemsCollection().find({}).sort({ _id: 1 }).toArray();
  res.status(200).json({ success: true, count: items.length, data: items });
}

async function getItem(req, res) {
  const _id = parseId(req, res);
  if (!_id) return;
  const item = await getItemsCollection().findOne({ _id });
  if (!item) return itemNotFound(req, res);
  res.status(200).json({ success: true, data: item });
}

async function createItem(req, res) {
  const message = validateFields(req.body);
  if (message) return res.status(400).json({ success: false, message });

  const { name, category, price } = req.body;
  const document = { name, category, price };
  // The MongoDB driver supplies the ObjectId; no custom id is created.
  const result = await getItemsCollection().insertOne(document);
  res.status(201).json({ success: true, data: { ...document, _id: result.insertedId } });
}

async function updateItem(req, res) {
  const _id = parseId(req, res);
  if (!_id) return;
  const message = validateFields(req.body, true);
  if (message) return res.status(400).json({ success: false, message });

  const updates = {};
  for (const field of ['name', 'category', 'price']) {
    if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
  }
  const item = await getItemsCollection().findOneAndUpdate(
    { _id }, { $set: updates },
    { returnDocument: 'after', includeResultMetadata: false }
  );
  if (!item) return itemNotFound(req, res);
  res.status(200).json({ success: true, data: item });
}

async function deleteItem(req, res) {
  const _id = parseId(req, res);
  if (!_id) return;
  const result = await getItemsCollection().deleteOne({ _id });
  if (result.deletedCount === 0) return itemNotFound(req, res);
  res.status(204).send();
}

module.exports = { getAllItems, getItem, createItem, updateItem, deleteItem };
