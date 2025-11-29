const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  active: {
    type: Boolean,
    default: true
  },
  subscriptionSource: {
    type: String,
    default: 'website'
  },
  unsubscribedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
subscriberSchema.index({ email: 1 });
subscriberSchema.index({ active: 1 });
subscriberSchema.index({ createdAt: -1 });

// Static method to check if email exists
subscriberSchema.statics.isEmailSubscribed = async function(email) {
  const subscriber = await this.findOne({ 
    email: email.toLowerCase(), 
    active: true 
  });
  return !!subscriber;
};

module.exports = mongoose.model('Subscriber', subscriberSchema);