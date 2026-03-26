import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  minStock: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStock: {
    type: Number,
    default: 500,
    min: 0
  },
  unit: {
    type: String,
    default: 'kg',
    required: true
  },
  itemType: {
    type: String,
    enum: ['raw', 'finished'],
    default: 'raw',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: String,
  supplier: String,
  costPerUnit: {
    type: Number,
    default: 0,
    min: 0
  },
  usageHistory: [{
    quantity: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      default: 'Manual deduction'
    },
    usedBy: {
      type: String,
      default: 'Admin'
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  }],
  requiredIngredients: [String],
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  // Waste tracking fields
  isWaste: {
    type: Boolean,
    default: false,
    index: true
  },
  wasteStatus: {
    type: String,
    enum: ['rough', 'damaged', 'expired', 'other'],
    default: null
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  wasteNotes: String,
  wasteRecordedDate: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  collection: 'inventoryItems'
});

export default mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);