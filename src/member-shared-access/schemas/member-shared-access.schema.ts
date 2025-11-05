import { Document } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Sub-schemas (kept as plain schema objects for mongoose).
 * These are not exported individually — the TS interface below
 * describes the runtime shape for compile-time safety.
 */
const SharedWithSubSchema = new mongoose.Schema(
  {
    member_id: { type: String, required: true },
    permissions: {
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    shared_at: { type: Date, default: Date.now },
    expires_at: { type: Date, default: null },
    is_revoked: { type: Boolean, default: false },
    note: { type: String, default: null },
  },
  { _id: false },
);

const ResourceShareSubSchema = new mongoose.Schema(
  {
    resource_id: { type: String, required: true },
    shared_with: { type: [SharedWithSubSchema], default: [] },
  },
  { _id: false },
);

/**
 * Main schema: one doc per (owner_member_id, module_key).
 * module_shared_with -> module-level recipients
 * resource_shares -> resource-specific recipients
 */
export const MemberSharedAccessSchema = new mongoose.Schema(
  {
    owner_member_id: { type: String, required: true, index: true },
    module_key: { type: String, required: true, index: true },
    module_shared_with: { type: [SharedWithSubSchema], default: [] },
    resource_shares: { type: [ResourceShareSubSchema], default: [] },
    shared_at: { type: Date, default: Date.now },
    is_revoked: { type: Boolean, default: false },
    note: { type: String, default: null },
  },
  { collection: 'member_shared_access', timestamps: true },
);

// Compound/usage-friendly indexes
MemberSharedAccessSchema.index({ owner_member_id: 1, module_key: 1 }, { unique: true });
MemberSharedAccessSchema.index({ 'module_shared_with.member_id': 1, module_key: 1 });
MemberSharedAccessSchema.index({ 'resource_shares.resource_id': 1 });
MemberSharedAccessSchema.index({ 'resource_shares.shared_with.member_id': 1 });

/**
 * TypeScript interface for compile-time safety when using mongoose models.
 */
export interface MemberSharedAccess extends Document {
  owner_member_id: string;
  module_key: string;
  module_shared_with: Array<{
    member_id: string;
    permissions: { read: boolean; update: boolean; delete: boolean };
    shared_at: Date;
    expires_at?: Date | null;
    is_revoked: boolean;
    note?: string | null;
  }>;
  resource_shares: Array<{
    resource_id: string;
    shared_with: Array<{
      member_id: string;
      permissions: { read: boolean; update: boolean; delete: boolean };
      shared_at: Date;
      expires_at?: Date | null;
      is_revoked: boolean;
      note?: string | null;
    }>;
  }>;
  shared_at: Date;
  is_revoked: boolean;
  note?: string | null;
}

export default MemberSharedAccessSchema;