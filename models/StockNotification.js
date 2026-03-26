import mongoose from "mongoose";

const stockNotificationSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true,
    index: true
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    required: true,
    min: 0
  },
  stockLevel: {
    type: String,
    enum: ['low', 'critical', 'out_of_stock'],
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  notificationType: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'restock_reminder'],
    default: 'low_stock',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved'],
    default: 'pending',
    index: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, { 
  collection: 'stockNotifications',
  timestamps: true 
});

// Index for efficient queries
stockNotificationSchema.index({ createdAt: -1 });
stockNotificationSchema.index({ isRead: 1, status: 1 });

export default mongoose.models.StockNotification || mongoose.model('StockNotification', stockNotificationSchema);