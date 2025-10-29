import mongoose from 'mongoose';

export const FamilyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: { type: Date },
    contactNumber: { type: String },
    email: { type: String },
    address: { type: String },
    relation: { type: String }, // e.g. Father, Mother, Son
    occupation: { type: String },
    education: { type: String },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Widowed', 'Divorced'],
    },
    income: { type: Number },

    passwordHash: { type: String },

    // future-proof dynamic fields (investments, insurance, etc.)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'family_members', timestamps: true },
);

FamilyMemberSchema.virtual('bankAccounts', {
  ref: 'BankAccount',
  localField: '_id',
  foreignField: 'memberId',
});

FamilyMemberSchema.set('toJSON', { virtuals: true });
FamilyMemberSchema.set('toObject', { virtuals: true });

export default FamilyMemberSchema;