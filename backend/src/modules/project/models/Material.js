import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
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
    enum: ['concrete', 'steel', 'wood', 'electrical', 'plumbing', 'finishing', 'hardware', 'other'],
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
    type: Number,
    default: 0,
    min: 0
  },
  used: {
    type: Number,
    default: 0,
    min: 0
  },
  remaining: {
    type: Number,
    default: function() {
      return this.allocated - this.used;
    }
  },
  location: {
    type: String,
    trim: true
  },
  specification: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  costPerUnit: {
    type: Number,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  qualityGrade: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'allocated', 'consumed', 'damaged', 'expired'],
    default: 'available'
  }
}, {
  timestamps: true,
  collection: 'materials'
});

// Pre-save middleware to calculate remaining quantity
materialSchema.pre('save', function(next) {
  this.remaining = this.allocated - this.used;
  next();
});

// Indexes for efficient querying
materialSchema.index({ companyId: 1, projectId: 1 });
materialSchema.index({ companyId: 1, projectId: 1, status: 1 });
materialSchema.index({ companyId: 1, projectId: 1, category: 1 });

export default mongoose.model('Material', materialSchema);