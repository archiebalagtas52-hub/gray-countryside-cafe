import mongoose from "mongoose";

const stockRequestSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed,  // Changed from ObjectId to Mixed to accept any type (string or ObjectId)
    ref: 'Product',
    required: false  // Optional - not required
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  requestedQuantity: {
    type: Number,
    required: true,
    min: 1  // Must be at least 1
  },
  unit: String,
  currentStock: Number,
  minStock: Number,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'fulfilled']
  },
  requestedBy: {
    type: String,
    default: 'staff'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  fulfilledQuantity: {
    type: Number,
    default: 0
  },
  fulfilledDate: Date,
  notes: String
}, { 
  collection: 'stockRequests',
  timestamps: true 
});

// Check if model already exists, otherwise create it
const StockRequest = mongoose.models.StockRequest || mongoose.model('StockRequest', stockRequestSchema);

export default StockRequest;