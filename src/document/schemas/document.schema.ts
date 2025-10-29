import mongoose from 'mongoose';

export const DocumentSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: false }, // uploader’s member ID
    uploadedBy: { type: String, required: true }, // now stores member’s name
    uploadedById: { type: String, required: false }, // optional: for linking in DB

    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },

    accessControl: {
      type: {
        type: String,
        enum: ['private', 'shared', 'public'],
        default: 'private',
      },
      sharedWith: { type: [String], default: [] }, // memberIds
    },

    documentType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'documents', timestamps: true },
);
