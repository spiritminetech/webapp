import mongoose from 'mongoose';

const alertEscalationSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  alertId: {
    type: Number,
    required: true,
    ref: 'Alert'
  },
  originalSupervisorId: {
    type: Number,
    required: true
  },
  escalationLevel: {
    type: Number,
    required: true,
    default: 1
  },
  escalatedTo: {
    type: Number, // Manager/Admin ID who received the escalation
    required: true
  },
  escalatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  escalationReason: {
    type: String,
    enum: ['timeout', 'manual', 'critical_priority', 'system_rule'],
    required: true
  },
  timeoutDuration: {
    type: Number, // Duration in minutes before escalation
    default: 15
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: {
    type: Date
  },
  acknowledgedBy: {
    type: Number // ID of person who acknowledged
  },
  resolution: {
    type: String,
    enum: ['resolved', 'forwarded', 'dismissed', 'pending'],
    default: 'pending'
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  // Notification tracking
  notificationsSent: [{
    recipient: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['email', 'sms', 'push', 'system'],
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'pending'],
      default: 'pending'
    }
  }],
  // Escalation chain tracking
  nextEscalationLevel: {
    type: Number
  },
  nextEscalationAt: {
    type: Date
  }
}, {
  collection: 'alertEscalations',
  timestamps: true
});

// Indexes for efficient queries
alertEscalationSchema.index({ alertId: 1 });
alertEscalationSchema.index({ originalSupervisorId: 1, escalatedAt: -1 });
alertEscalationSchema.index({ escalatedTo: 1, acknowledged: 1 });
alertEscalationSchema.index({ nextEscalationAt: 1 });

// Auto-increment ID
alertEscalationSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const lastEscalation = await this.constructor.findOne().sort({ id: -1 });
      this.id = lastEscalation ? lastEscalation.id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model('AlertEscalation', alertEscalationSchema);