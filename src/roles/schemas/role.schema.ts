import mongoose from 'mongoose';

export const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., Admin, Member, Guest
    permissions: [
      {
        module_key: { type: String, required: true }, // e.g., "documents", "loans"
        actions: [{ type: String }],                  // e.g., ["create", "read", "update", "delete"]
      },
    ],
    is_active: { type: Boolean, default: true },
  },
  { collection: 'roles', timestamps: true },
);
