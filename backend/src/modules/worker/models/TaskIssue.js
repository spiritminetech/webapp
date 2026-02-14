import mongoose from 'mongoose';

const TaskIssueSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    unique: true, 
    required: true 
  },
  assignmentId: { 
    type: Number, 
    required: true 
  },
  employeeId: { 
    type: Number, 
    required: true 
  },
  projectId: { 
    type: Number, 
    required: true 
  },
  
  ticketNumber: { 
    type: String, 
    unique: true 
  },
  
  issueType: {
    type: String,
    enum: [
      'material_shortage',
      'tool_malfunction',
      'safety_concern',
      'quality_issue',
      'weather_delay',
      'technical_problem',
      'other'
    ],
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  description: { 
    type: String, 
    required: true 
  },
  
  location: {
    latitude: Number,
    longitude: Number,
    workArea: String
  },
  
  photos: [String], // Array of photo URLs
  
  requestedAction: String,
  estimatedImpact: String,
  
  status: {
    type: String,
    enum: ['reported', 'acknowledged', 'in_progress', 'resolved', 'closed'],
    default: 'reported'
  },
  
  assignedTo: Number, // Supervisor ID
  resolvedBy: Number,
  resolution: String,
  
  reportedAt: { 
    type: Date, 
    default: Date.now 
  },
  acknowledgedAt: Date,
  resolvedAt: Date
}, {
  collection: 'taskIssues',
  timestamps: true
});

// Create indexes for efficient querying
TaskIssueSchema.index({ assignmentId: 1 });
TaskIssueSchema.index({ employeeId: 1 });
TaskIssueSchema.index({ projectId: 1 });
TaskIssueSchema.index({ status: 1 });
TaskIssueSchema.index({ priority: 1 });
TaskIssueSchema.index({ issueType: 1 });
TaskIssueSchema.index({ assignedTo: 1 });
TaskIssueSchema.index({ reportedAt: -1 });
TaskIssueSchema.index({ ticketNumber: 1 }, { unique: true, sparse: true });

// Compound indexes for common query patterns
TaskIssueSchema.index({ projectId: 1, status: 1 });
TaskIssueSchema.index({ employeeId: 1, reportedAt: -1 });
TaskIssueSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model('TaskIssue', TaskIssueSchema);