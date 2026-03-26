import mongoose from 'mongoose';

const staffAssignmentSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive'],
        default: 'pending'
    },
    assignedQuantity: {
        type: Number,
        default: 0
    },
    maxQuantity: {
        type: Number,
        default: 100
    },
    notes: String
}, {
    collection: 'staffAssignments',
    timestamps: true
});

export default mongoose.models.StaffAssignment || mongoose.model('StaffAssignment', staffAssignmentSchema);