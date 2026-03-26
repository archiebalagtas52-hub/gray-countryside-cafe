const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');

// Deduct inventory
router.post('/deduct', async (req, res) => {
    try {
        const { itemId, amount, reason, orderId } = req.body;
        
        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        
        const currentStock = parseFloat(item.currentStock) || 0;
        const newStock = Math.max(0, currentStock - parseFloat(amount));
        
        item.currentStock = newStock;
        await item.save();
        
        // Log the deduction
        if (!item.deductionHistory) item.deductionHistory = [];
        item.deductionHistory.push({
            amount: parseFloat(amount),
            newStock,
            reason: reason || 'Manual deduction',
            orderId,
            timestamp: new Date()
        });
        
        await item.save();
        
        res.json({
            success: true,
            newStock,
            message: 'Inventory deducted successfully'
        });
        
    } catch (error) {
        console.error('Error deducting inventory:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check menu item availability
router.post('/check-availability', async (req, res) => {
    try {
        const { menuItemName, quantity = 1 } = req.body;
        
        // You'll need to implement the logic based on your recipe mapping
        // This is a simplified version
        const result = {
            available: true,
            canMake: 10, // Example value
            message: 'Item is available'
        };
        
        res.json({ success: true, ...result });
        
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;