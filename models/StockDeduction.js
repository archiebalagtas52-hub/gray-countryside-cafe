import mongoose from "mongoose";

const stockDeductionSchema = new mongoose.Schema({
  // Product Information
  productName: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    index: true
  },
  
  // Ingredient Information
  ingredientName: {
    type: String,
    required: true,
    index: true
  },
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    index: true
  },
  
  // Stock Information
  quantityDeducted: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'kg'
  },
  
  // Stock History
  stockBefore: {
    type: Number,
    required: true,
    min: 0
  },
  stockAfter: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    default: 'success',
    index: true
  },
  
  // Metadata
  reason: {
    type: String,
    default: 'Menu product preparation'
  },
  notes: String,
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'stockDeductions'
});

// Index for queries
stockDeductionSchema.index({ productName: 1, createdAt: -1 });
stockDeductionSchema.index({ ingredientName: 1, createdAt: -1 });

export default mongoose.models.StockDeduction || mongoose.model('StockDeduction', stockDeductionSchema);
