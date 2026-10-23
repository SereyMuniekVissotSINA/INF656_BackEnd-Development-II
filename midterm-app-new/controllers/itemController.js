const fs = require('node:fs');
const path = require('node:path');

// Load once at startup. CRUD changes stay in memory until the server restarts.
const dataPath = path.join(__dirname, '..', 'data', 'items.json');
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let nextId = Math.max(0, ...items.map((item) => item.id)) + 1;

const findItem = (id) => items.find((item) => item.id === Number(id));

function itemNotFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Item with id ${req.params.id} not found`
  });
}

// Validate all fields before mutating, so an invalid PATCH changes nothing.
function validateFields(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Please send a JSON object with item fields';
  }

  const fields = ['name', 'category', 'price'];
  if (Object.keys(body).some((key) => !fields.includes(key))) {
    return 'Only name, category and price may be supplied; id is generated automatically';
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

// GET /api/items
function getAllItems(req, res) {
  res.status(200).json({ success: true, count: items.length, data: items });
}

// GET /api/items/:id
function getItem(req, res) {
  const item = findItem(req.params.id);
  if (!item) return itemNotFound(req, res);
  res.status(200).json({ success: true, data: item });
}

// POST /api/items
function createItem(req, res) {
  const message = validateFields(req.body);
  if (message) return res.status(400).json({ success: false, message });
  const { name, category, price } = req.body;
  const newItem = { id: nextId++, name, category, price };
  items.push(newItem);
  res.status(201).json({ success: true, data: newItem });
}

// PATCH /api/items/:id
function updateItem(req, res) {
  const item = findItem(req.params.id);
  if (!item) return itemNotFound(req, res);
  const message = validateFields(req.body, true);
  if (message) return res.status(400).json({ success: false, message });
  for (const field of ['name', 'category', 'price']) {
    if (Object.hasOwn(req.body, field)) item[field] = req.body[field];
  }
  res.status(200).json({ success: true, data: item });
}

// DELETE /api/items/:id
function deleteItem(req, res) {
  const index = items.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) return itemNotFound(req, res);
  items.splice(index, 1);
  res.status(204).send();
}

module.exports = { getAllItems, getItem, createItem, updateItem, deleteItem };
