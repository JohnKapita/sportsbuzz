const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalViews: {
    type: Number,
    default: 0
  },
  articleViews: {
    type: Map,
    of: Number,
    default: {}
  },
  categoryViews: {
    type: Map,
    of: Number,
    default: {}
  },
  newSubscribers: {
    type: Number,
    default: 0
  },
  newComments: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for date queries
analyticsSchema.index({ date: 1 });

// Static method to get or create today's analytics
analyticsSchema.statics.getTodayAnalytics = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ date: today });
  
  if (!analytics) {
    analytics = new this({ date: today });
    await analytics.save();
  }
  
  return analytics;
};

// Method to record a view
analyticsSchema.methods.recordView = function(articleId, category) {
  this.totalViews += 1;
  
  // Record article view
  const articleViews = this.articleViews.get(articleId.toString()) || 0;
  this.articleViews.set(articleId.toString(), articleViews + 1);
  
  // Record category view
  const categoryViews = this.categoryViews.get(category) || 0;
  this.categoryViews.set(category, categoryViews + 1);
  
  return this.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);