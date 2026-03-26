import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: ''
  },
  role: {
    type: String,
    required: true,
    default: 'user'
  }
}, {
  timestamps: true,
  collection: 'settings'
});

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);