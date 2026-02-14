import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['geofence_violation', 'worker_absence', 'attendance_anomaly', 'safety_alert'],
    required: true
  },
  priority: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: {
    type: Date
  },
  acknowledgedBy: {
    type: Number // Supervisor ID who acknowledged
  },
  relatedWorkerId: {
    type: Number
  },
  relatedProjectId: {
    type: Number
  },
  supervisorId: {
    type: Number,
    required: true
  },
  // Additional metadata for alert context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Auto-generated flag for system alerts
  isSystemGenerated: {
    type: Boolean,
    default: true
  },
  // Escalation tracking
  escalationLevel: {
    type: Number,
    default: 0
  },
  lastEscalatedAt: {
    type: Date
  },
  // Expiry for temporary alerts
  expiresAt: {
    type: Date
  }
}, {
  collection: 'alerts',
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ supervisorId: 1, timestamp: -1 });
alertSchema.index({ type: 1, priority: 1 });
alertSchema.index({ isRead: 1, supervisorId: 1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Auto-increment ID with better error handling
alertSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      // Use a more reliable method to get the next ID
      const lastAlert = await this.constructor.findOne({}, {}, { sort: { id: -1 } });
      this.id = lastAlert ? lastAlert.id + 1 : 1;
      
      // Ensure the ID is unique by checking for conflicts
      let attempts = 0;
      while (attempts < 10) {
        try {
          const existingAlert = await this.constructor.findOne({ id: this.id });
          if (!existingAlert) {
            break; // ID is unique, we can use it
          }
          this.id += 1; // Try next ID
          attempts += 1;
        } catch (error) {
          // If there's an error checking, just increment and try again
          this.id += 1;
          attempts += 1;
        }
      }
      
      if (attempts >= 10) {
        return next(new Error('Unable to generate unique alert ID after 10 attempts'));
      }
      
    } catch (error) {
      console.error('Error generating alert ID:', error);
      // Fallback to timestamp-based ID
      this.id = Date.now() % 1000000; // Use last 6 digits of timestamp
    }
  }
  next();
});

export default mongoose.model('Alert', alertSchema);