import mongoose from 'mongoose';

export const ClientModuleSchema = new mongoose.Schema(
  {
    tenant_id: { type: String, required: true },
    module_key: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    activated_at: { type: Date, default: Date.now },
  },
  { collection: 'modules', timestamps: true },
);