import mongoose from 'mongoose';

/**
 * RefreshToken Model
 * Stores refresh tokens for JWT authentication
 */
const RefreshTokenSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    unique: true, 
    required: true 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  companyId: { 
    type: Number, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceId: String
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  }
}, {
  collection: 'refreshTokens',
  timestamps: true
});

// Indexes for performance
RefreshTokenSchema.index({ userId: 1, isActive: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ token: 1 }, { unique: true });

// Auto-increment ID
RefreshTokenSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const lastToken = await RefreshToken.findOne({}, {}, { sort: { id: -1 } });
      this.id = lastToken ? lastToken.id + 1 : 1;
      console.log('Generated RefreshToken ID:', this.id);
    } catch (error) {
      console.error('Error generating RefreshToken ID:', error);
      return next(error);
    }
  }
  next();
});

// Instance methods
RefreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

RefreshTokenSchema.methods.markAsUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

RefreshTokenSchema.methods.revoke = function() {
  this.isActive = false;
  return this.save();
};

// Static methods
RefreshTokenSchema.statics.findByToken = function(token) {
  return this.findOne({ 
    token, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

RefreshTokenSchema.statics.revokeAllForUser = function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

RefreshTokenSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

RefreshTokenSchema.statics.getUserActiveTokens = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);

export default RefreshToken;