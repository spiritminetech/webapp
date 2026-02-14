import mongoose from 'mongoose';

const toolSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  companyId: {
    type: Number,
    required: true,
    index: true
  },
  projectId: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['power_tools', 'hand_tools', 'safety_equipment', 'measuring_tools', 'other'],
    default: 'other'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'pieces'
  },
  allocated: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair'],
    default: 'good'
  },
  serialNumber: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  cost: {
    type: Number,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'damaged', 'lost'],
    default: 'available'
  }
}, {
  timestamps: true,
  collection: 'tools'
});

// Indexes for efficient querying
toolSchema.index({ companyId: 1, projectId: 1 });
toolSchema.index({ companyId: 1, projectId: 1, status: 1 });
toolSchema.index({ companyId: 1, projectId: 1, allocated: 1 });

export default mongoose.model('Tool', toolSchema);