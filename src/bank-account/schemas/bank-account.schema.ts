import mongoose from 'mongoose';
import { EncryptionPlugin } from '../../common/plugins/encryption.plugin';

const NomineeSchema = new mongoose.Schema(
  {
      name: { type: String, required: true },
      relation: { type: String, required: true },
      dateOfBirth: { type: Date },
      contactNumber: { type: String },
      sharePercentage: { type: Number, default: 100 }, // optional if only one nominee
  },
  { _id: false } // subdocument, no separate _id
);

export const BankAccountSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', required: true }, // Reference to family member _id
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: { type: String },
    ifsc: { type: String },
    accountNumber: { type: String, required: true }, // Encrypt this in service
    accountType: { type: String, enum: ['savings', 'current', 'other'], default: 'savings' },
    currency: { type: String, default: 'INR' },
    isPrimary: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'closed'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    nominees: { type: [NomineeSchema], default: [] },
  },
  { collection: 'bank_accounts', timestamps: true },
);

// Add the plugin for encryption
console.log('📦 Attaching EncryptionPlugin to BankAccountSchema');
// BankAccountSchema.plugin(EncryptionPlugin, ['accountNumber', 'ifsc']);

// export const BankAccount = mongoose.model('BankAccount', BankAccountSchema);
