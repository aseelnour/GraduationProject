const mongoose = require('mongoose');

const donationRequestSchema = new mongoose.Schema({
  // User information (if authenticated)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Basic Information
  caseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  requestType: {
    type: String,
    required: true,
    enum: ['education', 'health', 'living', 'sponsoring', 'emergency', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  idNumber: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  
 // Bank Information
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  iban: {
    type: String,
    trim: true
  },
  branchName: {
    type: String,
    trim: true
  },
  swiftCode: {
    type: String,
    trim: true
  },
  
  totalAmount: {
    type: Number
  },
  totalDonations: {
    type: Number,
    default: 0
  },
  donationsCount: {
    type: Number,
    default: 0
  },
  
  // Dynamic fields (stored as object to accommodate different request types)
  dynamicFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Additional Information
  additionalNotes: {
    type: String,
    trim: true
  },
  urgencyLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  // Documents (store file paths or URLs)
  documents: [{
    name: { type: String },
    originalName: { type: String },
    path: { type: String },
    filename: { type: String },
    type: { type: String },
    size: { type: Number },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    validation: {
      isValid: { type: Boolean },
      confidence: { type: Number },
      analysis: { type: String }
    }
  }],
  
  // Request Status
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed']
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  },
  
  // Review information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
donationRequestSchema.index({ caseNumber: 1 });
donationRequestSchema.index({ email: 1 });
donationRequestSchema.index({ idNumber: 1 });
donationRequestSchema.index({ status: 1 });
donationRequestSchema.index({ requestType: 1 });
donationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DonationRequest', donationRequestSchema);
