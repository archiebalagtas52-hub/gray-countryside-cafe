import InventoryItem from '../models/InventoryItem.js';
import StockDeduction from '../models/StockDeduction.js';
import mongoose from 'mongoose';

class MongoDBInventoryService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing MongoDB Inventory Service...');
      
      const connectionState = mongoose.connection.readyState;
      if (connectionState !== 1) {
        console.warn('⚠️ MongoDB not connected, retrying in 5 seconds...');
        setTimeout(() => this.initialize(), 5000);
        return;
      }
      
      const count = await InventoryItem.countDocuments();
      console.log(`✅ MongoDB Service initialized (${count} inventory items found)`);
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing MongoDB Service:', error.message);
      setTimeout(() => this.initialize(), 5000);
    }
  }

  async getInventoryItem(itemName) {
    try {
      const item = await InventoryItem.findOne({ itemName: itemName.trim() });
      return item;
    } catch (error) {
      console.error(`❌ Error getting inventory item ${itemName}:`, error.message);
      return null;
    }
  }

  async getAllInventoryItems() {
    try {
      const items = await InventoryItem.find({ isActive: true }).sort({ category: 1, itemName: 1 });
      return items;
    } catch (error) {
      console.error('❌ Error getting all inventory items:', error.message);
      return [];
    }
  }

  async getInventoryByCategory(category) {
    try {
      const items = await InventoryItem.find({ category, isActive: true }).sort({ itemName: 1 });
      return items;
    } catch (error) {
      console.error(`❌ Error getting inventory for category ${category}:`, error.message);
      return [];
    }
  }

  async deductStock(ingredientName, quantity, productName = 'Unknown') {
    try {
      const item = await this.getInventoryItem(ingredientName);
      
      if (!item) {
        console.warn(`⚠️ Ingredient not found: ${ingredientName}`);
        return { success: false, error: 'Ingredient not found' };
      }
      
      const oldStock = item.currentStock;
      const newStock = Math.max(0, oldStock - quantity);
      
      item.currentStock = newStock;
      
      if (newStock === 0) {
        item.status = 'out_of_stock';
      } else if (newStock <= item.minStock) {
        item.status = 'low_stock';
      } else {
        item.status = 'in_stock';
      }
      
      item.usageHistory.push({
        quantity: quantity,
        notes: `Used for ${productName}`,
        date: new Date()
      });
      
      await item.save();
      
      const deductionLog = new StockDeduction({
        productName: productName,
        ingredientName: ingredientName,
        ingredientId: item._id,
        quantityDeducted: quantity,
        unit: item.unit,
        stockBefore: oldStock,
        stockAfter: newStock,
        status: 'success',
        reason: 'Menu product preparation'
      });
      
      await deductionLog.save();
      
      console.log(`✅ Stock deducted: ${ingredientName} ${oldStock} → ${newStock} (used ${quantity})`);
      
      return {
        success: true,
        ingredient: ingredientName,
        oldStock: oldStock,
        newStock: newStock,
        deducted: quantity,
        unit: item.unit
      };
    } catch (error) {
      console.error(`❌ Error deducting stock for ${ingredientName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async deductMultipleIngredients(ingredients, productName = 'Unknown') {
    try {
      const deductions = [];
      const errors = [];
      
      for (const [ingredientName, quantity] of Object.entries(ingredients)) {
        const normalizedName = ingredientName.replace(/_/g, ' ');
        const result = await this.deductStock(normalizedName, quantity, productName);
        
        if (result.success) {
          deductions.push(result);
        } else {
          errors.push({ ingredient: normalizedName, error: result.error });
        }
      }
      
      console.log(`📊 Batch deduction complete: ${deductions.length} success, ${errors.length} errors`);
      
      return {
        success: errors.length === 0,
        deductions: deductions,
        errors: errors,
        totalDeducted: deductions.length
      };
    } catch (error) {
      console.error('❌ Error in batch deduction:', error.message);
      return { success: false, error: error.message, deductions: [] };
    }
  }

  async addStock(ingredientName, quantity) {
    try {
      const item = await this.getInventoryItem(ingredientName);
      
      if (!item) {
        console.warn(`⚠️ Ingredient not found: ${ingredientName}`);
        return { success: false, error: 'Ingredient not found' };
      }
      
      const oldStock = item.currentStock;
      const newStock = Math.min(oldStock + quantity, item.maxStock);
      const actualAdded = newStock - oldStock;
      
      item.currentStock = newStock;
      
      if (newStock === 0) {
        item.status = 'out_of_stock';
      } else if (newStock <= item.minStock) {
        item.status = 'low_stock';
      } else {
        item.status = 'in_stock';
      }
      
      await item.save();
      
      console.log(`✅ Stock added: ${ingredientName} ${oldStock} → ${newStock}`);
      
      return {
        success: true,
        ingredient: ingredientName,
        oldStock: oldStock,
        newStock: newStock,
        added: actualAdded
      };
    } catch (error) {
      console.error(`❌ Error adding stock for ${ingredientName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async addItem(itemData) {
    try {
      const existingItem = await this.getInventoryItem(itemData.itemName);
      
      if (existingItem) {
        return { success: false, error: 'Item already exists' };
      }
      
      const newItem = new InventoryItem({
        itemName: itemData.itemName,
        category: itemData.category || 'Beverages',
        currentStock: itemData.currentStock || 50,
        minStock: itemData.minStock || 10,
        maxStock: itemData.maxStock || 100,
        unit: itemData.unit || 'bottles',
        description: itemData.description || '',
        status: 'in_stock'
      });
      
      await newItem.save();
      
      console.log(`✅ New item added: ${itemData.itemName}`);
      
      return {
        success: true,
        item: newItem
      };
    } catch (error) {
      console.error(`❌ Error adding item ${itemData.itemName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async setStock(ingredientName, quantity) {
    try {
      const item = await this.getInventoryItem(ingredientName);
      
      if (!item) {
        console.warn(`⚠️ Ingredient not found: ${ingredientName}`);
        return { success: false, error: 'Ingredient not found' };
      }
      
      const oldStock = item.currentStock;
      const newStock = Math.max(0, Math.min(quantity, item.maxStock));
      
      item.currentStock = newStock;
      
      if (newStock === 0) {
        item.status = 'out_of_stock';
      } else if (newStock <= item.minStock) {
        item.status = 'low_stock';
      } else {
        item.status = 'in_stock';
      }
      
      await item.save();
      
      console.log(`✅ Stock set: ${ingredientName} ${oldStock} → ${newStock}`);
      
      return {
        success: true,
        ingredient: ingredientName,
        oldStock: oldStock,
        newStock: newStock
      };
    } catch (error) {
      console.error(`❌ Error setting stock for ${ingredientName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async syncInventoryFromArray(inventoryArray) {
    try {
      let synced = 0;
      let created = 0;
      let errors = 0;
      
      for (const item of inventoryArray) {
        try {
          const existing = await this.getInventoryItem(item.itemName);
          
          if (existing) {
            existing.currentStock = item.currentStock;
            existing.maxStock = item.maxStock || 100;
            existing.minStock = item.minStock || 10;
            existing.unit = item.unit || 'kg';
            existing.category = item.category || 'ingredients';
            
            if (existing.currentStock === 0) {
              existing.status = 'out_of_stock';
            } else if (existing.currentStock <= existing.minStock) {
              existing.status = 'low_stock';
            } else {
              existing.status = 'in_stock';
            }
            
            await existing.save();
            synced++;
          } else {
            const newItem = new InventoryItem({
              itemName: item.itemName,
              currentStock: item.currentStock || 100,
              maxStock: item.maxStock || 100,
              minStock: item.minStock || 10,
              unit: item.unit || 'kg',
              category: item.category || 'ingredients',
              status: item.currentStock > 0 ? 'in_stock' : 'out_of_stock'
            });
            
            await newItem.save();
            created++;
          }
        } catch (itemError) {
          console.error(`❌ Error syncing ${item.itemName}:`, itemError.message);
          errors++;
        }
      }
      
      console.log(`✅ Inventory sync complete: ${synced} updated, ${created} created, ${errors} errors`);
      
      return {
        success: errors === 0,
        synced: synced,
        created: created,
        errors: errors
      };
    } catch (error) {
      console.error('❌ Error in inventory sync:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getInventorySummary() {
    try {
      const items = await this.getAllInventoryItems();
      
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;
      let totalValue = 0;
      
      items.forEach(item => {
        if (item.status === 'in_stock') inStock++;
        else if (item.status === 'low_stock') lowStock++;
        else if (item.status === 'out_of_stock') outOfStock++;
        
        totalValue += (item.currentStock * item.costPerUnit);
      });
      
      return {
        totalItems: items.length,
        inStock: inStock,
        lowStock: lowStock,
        outOfStock: outOfStock,
        totalValue: totalValue
      };
    } catch (error) {
      console.error('❌ Error getting inventory summary:', error.message);
      return null;
    }
  }

  async getDeductionHistory(productName, limit = 10) {
    try {
      const history = await StockDeduction.find({ productName })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return history;
    } catch (error) {
      console.error(`❌ Error getting deduction history for ${productName}:`, error.message);
      return [];
    }
  }

  async getIngredientDeductionHistory(ingredientName, limit = 10) {
    try {
      const history = await StockDeduction.find({ ingredientName })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return history;
    } catch (error) {
      console.error(`❌ Error getting deduction history for ${ingredientName}:`, error.message);
      return [];
    }
  }

  async createSnapshot() {
    try {
      const items = await this.getAllInventoryItems();
      const summary = await this.getInventorySummary();
      
      const snapshot = new InventorySnapshot({
        snapshotDate: new Date(),
        totalItems: items.length,
        itemsInStock: summary.inStock,
        itemsLowStock: summary.lowStock,
        itemsOutOfStock: summary.outOfStock,
        items: items.map(item => ({
          itemName: item.itemName,
          itemId: item._id,
          category: item.category,
          currentStock: item.currentStock,
          unit: item.unit,
          status: item.status
        })),
        totalValue: summary.totalValue
      });
      
      await snapshot.save();
      console.log('✅ Inventory snapshot created');
      
      return snapshot;
    } catch (error) {
      console.error('❌ Error creating snapshot:', error.message);
      return null;
    }
  }
}

const mongoDBInventoryService = new MongoDBInventoryService();

export default mongoDBInventoryService;
