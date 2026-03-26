// ==================== SHARED INVENTORY MANAGEMENT SYSTEM ====================
// This file manages ingredient stock deductions and persistence
// Used by both menu.js and inventory.js

class InventoryManager {
    constructor() {
        this.STORAGE_KEY = 'pos_inventory_stock_values';
        this.MAX_STOCK = 100; // Maximum stock per ingredient
        this.MIN_STOCK = 0;
        this.inventoryData = {};
        this.loadFromStorage();
    }

    // Load inventory from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.inventoryData = JSON.parse(stored);
                console.log('✅ Inventory loaded from storage:', Object.keys(this.inventoryData).length, 'items');
            } else {
                console.log('📦 No stored inventory found, using defaults');
            }
        } catch (error) {
            console.error('❌ Error loading inventory from storage:', error);
            this.inventoryData = {};
        }
    }

    // Save inventory to localStorage
    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inventoryData));
            console.log('💾 Inventory saved to storage');
        } catch (error) {
            console.error('❌ Error saving inventory to storage:', error);
        }
    }

    // Get current stock for an ingredient
    getStock(ingredientName) {
        const normalized = this.normalize(ingredientName);
        return this.inventoryData[normalized] || 0;
    }

    // Set stock for an ingredient (respects MAX_STOCK cap)
    setStock(ingredientName, quantity) {
        const normalized = this.normalize(ingredientName);
        const cappedQuantity = Math.min(Math.max(quantity, this.MIN_STOCK), this.MAX_STOCK);
        
        if (cappedQuantity !== quantity) {
            console.warn(`⚠️ Stock capped at ${this.MAX_STOCK}: ${ingredientName} (requested: ${quantity}, set to: ${cappedQuantity})`);
        }
        
        this.inventoryData[normalized] = cappedQuantity;
        this.saveToStorage();
        console.log(`✅ Set ${ingredientName}: ${cappedQuantity}/${this.MAX_STOCK}`);
        return cappedQuantity;
    }

    // Deduct stock for an ingredient
    async deductStock(ingredientName, quantity, productName = 'Unknown') {
        const normalized = this.normalize(ingredientName);
        const currentStock = this.inventoryData[normalized] || 0;
        const newStock = Math.max(0, currentStock - quantity);
        
        this.inventoryData[normalized] = newStock;
        this.saveToStorage();
        
        console.log(`📉 Deducted ${ingredientName}: ${currentStock} - ${quantity} = ${newStock}`);
        
        // Also send to MongoDB for permanent storage
        try {
            const mongoResult = await this.sendToMongoDB('deduct', {
                ingredientName: ingredientName,
                quantity: quantity,
                productName: productName
            });
            
            if (mongoResult.success) {
                console.log(`✅ MongoDB deduction saved: ${ingredientName}`);
            } else {
                console.warn(`⚠️ MongoDB save failed (localStorage saved):`, mongoResult.error);
            }
        } catch (error) {
            console.warn(`⚠️ Could not save to MongoDB (localStorage saved):`, error.message);
        }
        
        return {
            success: true,
            ingredient: ingredientName,
            oldStock: currentStock,
            newStock: newStock,
            deducted: quantity,
            isOutOfStock: newStock === 0
        };
    }

    // Add stock to an ingredient (respects MAX_STOCK cap)
    addStock(ingredientName, quantity) {
        const normalized = this.normalize(ingredientName);
        const currentStock = this.inventoryData[normalized] || 0;
        const proposedStock = currentStock + quantity;
        const newStock = Math.min(proposedStock, this.MAX_STOCK);
        
        this.inventoryData[normalized] = newStock;
        this.saveToStorage();
        
        if (newStock < proposedStock) {
            console.warn(`⚠️ Stock capped at ${this.MAX_STOCK}: ${ingredientName}`);
        }
        
        console.log(`📈 Added ${ingredientName}: ${currentStock} + ${quantity} = ${newStock}`);
        
        return {
            success: true,
            ingredient: ingredientName,
            oldStock: currentStock,
            newStock: newStock,
            added: quantity,
            capped: newStock < proposedStock
        };
    }

    // Normalize ingredient name (lowercase, trim spaces)
    normalize(name) {
        return name.toLowerCase().trim().replace(/_/g, ' ');
    }

    // Get all inventory as object
    getAllInventory() {
        return { ...this.inventoryData };
    }

    // Reset inventory for an ingredient
    resetStock(ingredientName) {
        const normalized = this.normalize(ingredientName);
        this.inventoryData[normalized] = this.MAX_STOCK;
        this.saveToStorage();
        console.log(`🔄 Reset ${ingredientName} to ${this.MAX_STOCK}`);
        return this.MAX_STOCK;
    }

    // Clear all inventory (for admin)
    clearAll() {
        this.inventoryData = {};
        this.saveToStorage();
        console.log('🧹 All inventory cleared');
    }

    // Check if ingredient has sufficient stock
    hasSufficientStock(ingredientName, required) {
        const currentStock = this.getStock(ingredientName);
        return currentStock >= required;
    }

    // Get shortage amount
    getShortage(ingredientName, required) {
        const currentStock = this.getStock(ingredientName);
        return Math.max(0, required - currentStock);
    }

    // Sync with FALLBACK_INVENTORY_ITEMS (for menu.js)
    syncWithFallback(fallbackItems) {
        console.log('🔄 Syncing inventory with FALLBACK_INVENTORY_ITEMS...');
        fallbackItems.forEach(item => {
            const normalized = this.normalize(item.itemName);
            if (!this.inventoryData.hasOwnProperty(normalized)) {
                this.inventoryData[normalized] = item.currentStock;
                console.log(`  Added ${item.itemName}: ${item.currentStock}`);
            }
        });
        this.saveToStorage();
        console.log('✅ Sync complete');
    }

    // Update FALLBACK_INVENTORY_ITEMS from storage (for menu.js)
    updateFallbackFromStorage(fallbackItems) {
        console.log('🔄 Updating FALLBACK_INVENTORY_ITEMS from storage...');
        fallbackItems.forEach(item => {
            const normalized = this.normalize(item.itemName);
            if (this.inventoryData.hasOwnProperty(normalized)) {
                item.currentStock = this.inventoryData[normalized];
                console.log(`  Updated ${item.itemName}: ${item.currentStock}`);
            }
        });
        console.log('✅ Update complete');
    }

    // Send deduction data to MongoDB API
    async sendToMongoDB(action, data) {
        try {
            const endpoint = action === 'deduct' ? '/api/inventory/deduct' : '/api/inventory/set-stock';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.error || 'API error' };
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
const inventoryManager = new InventoryManager();

console.log('✅ InventoryManager initialized');
