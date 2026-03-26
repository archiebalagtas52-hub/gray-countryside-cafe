import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  items: [
    {
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      size: String,
      image: String,
      productId: mongoose.Schema.Types.ObjectId,
      vatable: {
        type: Boolean,
        default: true
      }
    }
  ],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: Number,
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'check', 'online'],
      default: 'cash'
    },
    amountPaid: Number,
    change: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  paymentMethod: String,
  status: {
    type: String,
    default: 'completed',
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled', 'completed'],
    index: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  tableNumber: String,
  type: {
    type: String,
    enum: ['Dine In', 'Takeout', 'Delivery'],
    default: 'Dine In'
  },
  notes: String,
  cashier: String,
  isVoid: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  collection: 'orders'
});

export default mongoose.models.Order || mongoose.model('Order', orderSchema);