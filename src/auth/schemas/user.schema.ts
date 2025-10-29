import mongoose from 'mongoose';

// Export a standalone Mongoose Schema to be used when creating tenant models dynamically
export const TenantUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  passwordHash: { type: String, required: true },
  roles: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});
