import mongoose from 'mongoose';

export const ModuleSchema = new mongoose.Schema(
  {
    module_name: { type: String, required: true },
    module_key: { type: String, required: true },
    description: { type: String },
    is_active: { type: Boolean, default: false },
  },
  { collection: 'modules', timestamps: true },
);