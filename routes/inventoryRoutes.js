// ==================== INVENTORY API ROUTES ====================
// Handles all inventory operations and saves to MongoDB

import express from 'express';
import mongoDBInventoryService from '../services/mongoDBInventoryService.js';
import InventoryItem from '../models/InventoryItem.js';
import StockDeduction from '../models/StockDeduction.js';

const router = express.Router();

// ==================== GET ENDPOINTS ====================

// Get all inventory items
router.get('/items', async (req, res) => {
  try {
    const items = await mongoDBInventoryService.getAllInventoryItems();
    res.json({ success: true, items: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get inventory by category
router.get('/items/category/:category', async (req, res) => {
  try {
    const items = await mongoDBInventoryService.getInventoryByCategory(req.params.category);
    res.json({ success: true, items: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single inventory item
router.get('/items/:itemName', async (req, res) => {
  try {
    const item = await mongoDBInventoryService.getInventoryItem(req.params.itemName);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, item: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get inventory summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await mongoDBInventoryService.getInventorySummary();
    res.json({ success: true, summary: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DEDUCTION ENDPOINTS ====================

// Deduct stock for single ingredient
router.post('/deduct', async (req, res) => {
  try {
    const { ingredientName, quantity, productName } = req.body;
    
    if (!ingredientName || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const result = await mongoDBInventoryService.deductStock(
      ingredientName,
      quantity,
      productName || 'Unknown'
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deduct multiple ingredients (batch)
router.post('/batch-deduct', async (req, res) => {
  try {
    const { ingredients, productName } = req.body;
    
    if (!ingredients || Object.keys(ingredients).length === 0) {
      return res.status(400).json({ success: false, error: 'No ingredients provided' });
    }
    
    const result = await mongoDBInventoryService.deductMultipleIngredients(
      ingredients,
      productName || 'Unknown'
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STOCK MANAGEMENT ====================

// Add stock
router.post('/add-stock', async (req, res) => {
  try {
    const { ingredientName, quantity } = req.body;
    
    if (!ingredientName || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const result = await mongoDBInventoryService.addStock(ingredientName, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new inventory item
router.post('/add-item', async (req, res) => {
  try {
    const itemData = req.body;
    
    if (!itemData.itemName) {
      return res.status(400).json({ success: false, error: 'Item name is required' });
    }
    
    const result = await mongoDBInventoryService.addItem(itemData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set stock to exact amount
router.post('/set-stock', async (req, res) => {
  try {
    const { ingredientName, quantity } = req.body;
    
    if (!ingredientName || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const result = await mongoDBInventoryService.setStock(ingredientName, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BULK OPERATIONS ====================

// Sync inventory from array (for initialization)
router.post('/sync', async (req, res) => {
  try {
    const { inventoryArray } = req.body;
    
    if (!Array.isArray(inventoryArray) || inventoryArray.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid inventory array' });
    }
    
    const result = await mongoDBInventoryService.syncInventoryFromArray(inventoryArray);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch update inventory (backward compatible)
router.post('/batch-update', async (req, res) => {
  try {
    const { updates, productName } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    const results = [];
    
    for (const update of updates) {
      const { itemName, currentStock } = update;
      const result = await mongoDBInventoryService.setStock(itemName, currentStock);
      results.push(result);
    }
    
    res.json({
      success: results.every(r => r.success),
      updates: results,
      totalUpdated: results.filter(r => r.success).length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPORTS ====================

// Get deduction history for product
router.get('/history/product/:productName', async (req, res) => {
  try {
    const history = await mongoDBInventoryService.getDeductionHistory(
      req.params.productName,
      req.query.limit || 10
    );
    res.json({ success: true, history: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get deduction history for ingredient
router.get('/history/ingredient/:ingredientName', async (req, res) => {
  try {
    const history = await mongoDBInventoryService.getIngredientDeductionHistory(
      req.params.ingredientName,
      req.query.limit || 10
    );
    res.json({ success: true, history: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = await mongoDBInventoryService.createSnapshot();
    if (snapshot) {
      res.json({ success: true, snapshot: snapshot });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create snapshot' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;




//==================== GET ENDPOINTS ====================//