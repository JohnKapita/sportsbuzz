const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [1000, 'Title cannot exceed 1000 characters']
  },
  content: {
    type: String,
    required: [true, 'Article content is required'],
    minlength: [50, 'Content must be at least 50 characters long']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['football', 'cricket', 'rugby', 'athletics', 'women', 'basketball', 'tennis'],
      message: 'Invalid category'
    }
  },
  image: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'Admin',
    trim: true
  },
  published: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    views: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
articleSchema.index({ category: 1, published: 1, createdAt: -1 });
articleSchema.index({ featured: 1, published: 1 });
articleSchema.index({ views: -1 });

// Virtual for excerpt
articleSchema.virtual('excerpt').get(function() {
  return this.content.substring(0, 150) + '...';
});

// Method to record daily views
articleSchema.methods.recordView = function() {
  this.views += 1;
  
  const today = new Date().toDateString();
  const viewRecord = this.viewHistory.find(record => 
    new Date(record.date).toDateString() === today
  );
  
  if (viewRecord) {
    viewRecord.views += 1;
  } else {
    this.viewHistory.push({
      date: new Date(),
      views: 1
    });
  }
  
  return this.save();
};

module.exports = mongoose.model('Article', articleSchema);