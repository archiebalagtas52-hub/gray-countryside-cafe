import express from 'express';
import MenuItem from '../models/Menuitem.js';
import StaffAssignment from '../models/staffassignModel.js';
import InventoryItem from '../models/InventoryItem.js';

const router = express.Router();

// Get staff profile
router.get('/profile', async (req, res) => {
    try {
        res.json({
            success: true,
            staff: req.user // From auth middleware
        });
    } catch (error) {
        console.error('Error getting staff profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get staff assigned items
router.get('/assigned-items', async (req, res) => {
    try {
        const staffId = req.user._id;
        
        const assignments = await StaffAssignment.find({ staffId: staffId, status: 'active' })
            .populate('menuItemId');
        
        const items = assignments.map(assignment => {
            const item = assignment.menuItemId.toObject();
            return {
                ...item,
                assignedQuantity: assignment.assignedQuantity,
                lastUpdated: assignment.updatedAt
            };
        });
        
        res.json({
            success: true,
            items: items
        });
    } catch (error) {
        console.error('Error getting assigned items:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Request item assignment
router.post('/request-assignment', async (req, res) => {
    try {
        const { menuItemId } = req.body;
        const staffId = req.user._id;
        
        const existingAssignment = await StaffAssignment.findOne({
            staffId: staffId,
            menuItemId: menuItemId,
            status: { $in: ['active', 'pending'] }
        });
        
        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: 'Already assigned or pending assignment'
            });
        }
        
        const assignment = new StaffAssignment({
            staffId: staffId,
            menuItemId: menuItemId,
            status: 'pending',
            assignedQuantity: 0
        });
        
        await assignment.save();
        
        res.json({
            success: true,
            message: 'Assignment request submitted',
            assignment: assignment
        });
    } catch (error) {
        console.error('Error requesting assignment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get available items (for staff)
router.get('/available-items', async (req, res) => {
    try {
        const staffId = req.user._id;
        
        // Get all active menu items
        const allItems = await MenuItem.find({ isActive: true });
        
        // Get staff's assigned items
        const assignments = await StaffAssignment.find({
            staffId: staffId,
            status: 'active'
        }).select('menuItemId');
        
        const assignedItemIds = assignments.map(a => a.menuItemId.toString());
        
        // Filter out assigned items
        const availableItems = allItems.filter(item => 
            !assignedItemIds.includes(item._id.toString())
        );
        
        res.json({
            success: true,
            items: availableItems
        });
    } catch (error) {
        console.error('Error getting available items:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== STAFF INVENTORY ENDPOINTS ====================
// Get all staff inventory items
router.get('/inventory', async (req, res) => {
    try {
        const inventoryItems = await InventoryItem.find({ itemType: 'finished' });
        res.json({
            success: true,
            data: inventoryItems
        });
    } catch (error) {
        console.error('Error fetching staff inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching staff inventory',
            error: error.message 
        });
    }
});

// Get single staff inventory item
router.get('/inventory/:id', async (req, res) => {
    try {
        const item = await InventoryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Inventory item not found' 
            });
        }
        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error fetching staff inventory item:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching staff inventory item',
            error: error.message 
        });
    }
});

// Create or add to staff inventory
router.post('/inventory', async (req, res) => {
    try {
        const { itemName, name, category, unit, currentStock, minStock, maxStock, price, itemType, isActive, notes } = req.body;
        
        // Check if item already exists
        const existingItem = await InventoryItem.findOne({ 
            $or: [
                { itemName: itemName || name },
                { 'name': itemName || name }
            ]
        });
        
        if (existingItem) {
            // Update existing item by adding to stock
            existingItem.currentStock = (parseInt(existingItem.currentStock) || 0) + (parseInt(currentStock) || 0);
            await existingItem.save();
            return res.json({
                success: true,
                message: 'Staff inventory updated',
                data: existingItem
            });
        }
        
        // Create new inventory item
        const newItem = new InventoryItem({
            itemName: itemName || name,
            category: category,
            currentStock: parseInt(currentStock) || 0,
            minStock: parseInt(minStock) || 10,
            maxStock: parseInt(maxStock) || 200,
            unit: unit,
            itemType: itemType || 'finished',
            isActive: isActive !== false
        });
        
        await newItem.save();
        
        res.json({
            success: true,
            message: 'Staff inventory item created',
            data: newItem
        });
    } catch (error) {
        console.error('Error creating staff inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating staff inventory',
            error: error.message 
        });
    }
});

// Update staff inventory item
router.put('/inventory/:id', async (req, res) => {
    try {
        const { currentStock, minStock, maxStock, isActive, notes } = req.body;
        
        const item = await InventoryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Inventory item not found' 
            });
        }
        
        // Update fields
        if (currentStock !== undefined) item.currentStock = parseInt(currentStock);
        if (minStock !== undefined) item.minStock = parseInt(minStock);
        if (maxStock !== undefined) item.maxStock = parseInt(maxStock);
        if (isActive !== undefined) item.isActive = isActive;
        
        await item.save();
        
        res.json({
            success: true,
            message: 'Staff inventory updated',
            data: item
        });
    } catch (error) {
        console.error('Error updating staff inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating staff inventory',
            error: error.message 
        });
    }
});

// Delete staff inventory item
router.delete('/inventory/:id', async (req, res) => {
    try {
        const item = await InventoryItem.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Inventory item not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Staff inventory item deleted',
            data: item
        });
    } catch (error) {
        console.error('Error deleting staff inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting staff inventory',
            error: error.message 
        });
    }
});

// Reduce inventory after order is placed
router.post('/inventory-reduction', async (req, res) => {
    try {
        const { productReductions, servingwareReductions, ingredientReductions, orderId, timestamp } = req.body;
        
        if (!productReductions || productReductions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No product reductions provided'
            });
        }

        // Update each product's stock in the database
        const updateResults = [];
        for (const reduction of productReductions) {
            const updated = await InventoryItem.findByIdAndUpdate(
                reduction.productId,
                { currentStock: reduction.newStock },
                { new: true }
            );
            
            if (updated) {
                updateResults.push({
                    productId: reduction.productId,
                    productName: reduction.productName,
                    oldStock: reduction.oldStock,
                    newStock: reduction.newStock,
                    quantitySold: reduction.quantitySold,
                    updated: true
                });
            } else {
                updateResults.push({
                    productId: reduction.productId,
                    productName: reduction.productName,
                    updated: false,
                    message: 'Product not found in database'
                });
            }
        }

        res.json({
            success: true,
            message: 'Inventory reduction recorded successfully',
            orderId: orderId,
            timestamp: timestamp,
            updates: updateResults
        });
    } catch (error) {
        console.error('Error reducing inventory after order:', error);
        res.status(500).json({
            success: false,
            message: 'Error reducing inventory after order',
            error: error.message
        });
    }
});

export default router;