import mongoose from 'mongoose';

const stockTransferSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['request_from_inventory', 'transfer_to_staff'],
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    menuItemName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    previousStock: {
        type: Number,
        default: 0
    },
    newStock: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    notes: String,
    managerNotes: String,
    processedAt: Date,
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    collection: 'stockTransfers',
    timestamps: true
});

export default mongoose.models.StockTransfer || mongoose.model('StockTransfer', stockTransferSchema);