import express from 'express';
import MenuItem from '../models/Menuitem.js';
import InventoryItem from '../models/InventoryItem.js';
import StockTransfer from '../models/StocktransferModel.js';

const router = express.Router();

// Staff requests stock from inventory
router.post('/request-stock', async (req, res) => {
    try {
        console.log('📦 API: Stock request received:', req.body);
        
        const { menuItemId, quantity, notes } = req.body;
        const staffId = req.user._id; // From auth middleware
        
        // Validation
        if (!menuItemId || !quantity) {
            console.warn('⚠️ Missing required fields: menuItemId or quantity');
            return res.status(400).json({
                success: false,
                message: 'menuItemId and quantity are required'
            });
        }
        
        if (quantity <= 0) {
            console.warn('⚠️ Invalid quantity:', quantity);
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }
        
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            console.error(`❌ Menu item not found: ${menuItemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        const transfer = new StockTransfer({
            type: 'request_from_inventory',
            staffId: staffId,
            menuItemId: menuItemId,
            menuItemName: menuItem.name,
            quantity: quantity,
            status: 'pending',
            notes: notes || `Stock request for ${menuItem.name}`
        });
        
        await transfer.save();
        
        console.log(`✅ Stock request created: ${transfer._id} for ${menuItem.name} x${quantity}`);
        
        res.status(201).json({
            success: true,
            message: 'Stock request submitted successfully',
            transfer: {
                _id: transfer._id,
                menuItemName: transfer.menuItemName,
                quantity: transfer.quantity,
                status: transfer.status,
                createdAt: transfer.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Error requesting stock:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error creating stock request',
            error: error.message
        });
    }
});

// Manager sends stock to staff
router.post('/send-to-staff', async (req, res) => {
    try {
        console.log('📤 API: Sending stock to staff:', req.body);
        
        const { menuItemId, quantity, staffId, notes } = req.body;
        
        // Validation
        if (!menuItemId || !quantity || !staffId) {
            console.warn('⚠️ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'menuItemId, quantity, and staffId are required'
            });
        }
        
        if (quantity <= 0) {
            console.warn('⚠️ Invalid quantity:', quantity);
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }
        
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            console.error(`❌ Menu item not found: ${menuItemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        if (menuItem.currentStock < quantity) {
            console.warn(`⚠️ Insufficient stock for ${menuItem.name}. Available: ${menuItem.currentStock}, Requested: ${quantity}`);
            return res.status(409).json({
                success: false,
                message: `Insufficient stock. Available: ${menuItem.currentStock}, Requested: ${quantity}`,
                available: menuItem.currentStock,
                requested: quantity
            });
        }
        
        // Record previous stock
        const previousStock = menuItem.currentStock;
        
        // Update menu item stock
        menuItem.currentStock -= quantity;
        await menuItem.save();
        
        const transfer = new StockTransfer({
            type: 'transfer_to_staff',
            staffId: staffId,
            menuItemId: menuItemId,
            menuItemName: menuItem.name,
            quantity: quantity,
            previousStock: previousStock,
            newStock: menuItem.currentStock,
            status: 'completed',
            notes: notes || `Stock transfer to staff`
        });
        
        await transfer.save();
        
        console.log(`✅ Stock transferred: ${menuItem.name} x${quantity} (${previousStock} → ${menuItem.currentStock})`);
        
        res.status(201).json({
            success: true,
            message: 'Stock transferred to staff successfully',
            transfer: {
                _id: transfer._id,
                menuItemName: transfer.menuItemName,
                quantity: transfer.quantity,
                previousStock: previousStock,
                newStock: menuItem.currentStock,
                status: transfer.status,
                completedAt: transfer.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Error sending stock to staff:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error transferring stock',
            error: error.message
        });
    }
});

// Get all pending requests (for manager)
router.get('/pending-requests', async (req, res) => {
    try {
        console.log('📋 API: Fetching pending stock requests');
        
        const requests = await StockTransfer.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .populate('staffId', 'name email')
            .lean();
        
        console.log(`✅ Found ${requests.length} pending requests`);
        
        res.json({
            success: true,
            data: requests,
            count: requests.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching pending requests:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending requests',
            error: error.message
        });
    }
});

// Approve/Reject request
router.put('/request/:requestId', async (req, res) => {
    try {
        console.log(`📝 API: Updating request ${req.params.requestId}:`, req.body);
        
        const { requestId } = req.params;
        const { status, notes } = req.body;
        
        if (!status || !['approved', 'rejected'].includes(status)) {
            console.warn('⚠️ Invalid status:', status);
            return res.status(400).json({
                success: false,
                message: 'Status must be either "approved" or "rejected"'
            });
        }
        
        const transfer = await StockTransfer.findByIdAndUpdate(
            requestId,
            {
                status: status,
                notes: notes || transfer.notes
            },
            { new: true }
        );
        
        if (!transfer) {
            console.error(`❌ Request not found: ${requestId}`);
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }
        
        console.log(`✅ Request ${requestId} updated to status: ${status}`);
        
        res.json({
            success: true,
            message: `Request ${status} successfully`,
            transfer: transfer
        });
        
    } catch (error) {
        console.error('❌ Error updating request:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating request',
            error: error.message
        });
    }
});

// Get transfer history
router.get('/history', async (req, res) => {
    try {
        console.log('📊 API: Fetching stock transfer history');
        
        const transfers = await StockTransfer.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        
        console.log(`✅ Found ${transfers.length} transfer records`);
        
        res.json({
            success: true,
            data: transfers,
            count: transfers.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching transfer history:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching transfer history',
            error: error.message
        });
    }
});

export default router;