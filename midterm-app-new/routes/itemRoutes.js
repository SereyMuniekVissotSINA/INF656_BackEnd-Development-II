const express = require('express');
const {
  getAllItems, getItem, createItem, updateItem, deleteItem
} = require('../controllers/itemController');

const router = express.Router();

router.route('/').get(getAllItems).post(createItem);
router.route('/:id').get(getItem).patch(updateItem).delete(deleteItem);

module.exports = router;
