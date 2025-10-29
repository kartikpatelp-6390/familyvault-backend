import mongoose from 'mongoose';
import { encryptData, decryptData, getTenantEncryptionKey } from '../../utils/encryption.utils';

/**
 * 🔒 EncryptionPlugin
 * Universal per-tenant field encryption for Mongoose schemas.
 *
 * - Encrypts sensitive fields using tenant-specific key
 * - Decrypts automatically on .toJSON() / .toObject()
 * - Does NOT persist tenantId in MongoDB
 */
export function EncryptionPlugin(schema: mongoose.Schema, fieldsToEncrypt: string[]) {

  /**
   * Pre-save middleware — encrypt fields before saving.
   * Uses runtime _tenantId (not persisted in DB).
   */
  schema.pre('save', function (next) {
    const doc = this as any;
    const tenantId = doc._tenantId || doc.tenantId;
    if (!tenantId) return next();

    const tenantKey = getTenantEncryptionKey(tenantId);

    for (const field of fieldsToEncrypt) {
      if (doc.isModified(field) && doc[field]) {
        doc[field] = encryptData(doc[field], tenantKey);
      }
    }

    next();
  });

  /**
   * Auto-decryption utility (used by toJSON/toObject)
   */
  function decryptFields(input: any, tenantId?: string) {
    if (!input) return input;

    const obj = JSON.parse(JSON.stringify(input));
    const tid = tenantId;
    if (!tid) {
      return obj;
    }

    const tenantKey = getTenantEncryptionKey(tid);

    for (const field of fieldsToEncrypt) {
      if (obj[field]) {
        try {
          obj[field] = decryptData(obj[field], tenantKey);
        } catch {
          // skip if already decrypted or invalid
        }
      }
    }

    return obj;
  }

  /**
   * 🔓 Post 'find' middleware (RegExp version)
   * Works for find, findOne, findById, findOneAndUpdate, etc.
   */
  schema.post(/find/, function (result: any) {
    const query = this as mongoose.Query<any, any>;
    const tenantId = (query as any).options?.tenantId;

    if (!result || !tenantId) {
      return result;
    }

    const applyDecryption = (doc: any) => {
      const decrypted = decryptFields(doc, tenantId);
      for (const field of Object.keys(decrypted)) {
        doc[field] = decrypted[field];
      }
    };

    if (Array.isArray(result)) {
      result.forEach((doc) => applyDecryption(doc));
    } else {
      applyDecryption(result);
    }
  });

  /**
   * 👤 Add helper method for setting tenant context dynamically.
   * Usage: document.setTenantContext(tenantId)
   */
  schema.method('setTenantContext', function (tenantId: string) {
    this._tenantId = tenantId;
  });

  return schema;
}
