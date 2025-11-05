import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import mongoose from 'mongoose';
import MemberSharedAccessSchema, { MemberSharedAccess } from './schemas/member-shared-access.schema';

@Injectable()
export class MemberSharedAccessService {
  // Cache models per tenant connection
  private modelCache = new Map<string, mongoose.Model<MemberSharedAccess>>();

  /**
   * Returns (and caches) the Mongoose model for the given tenant connection.
   */
  private getModel(conn: mongoose.Connection): mongoose.Model<MemberSharedAccess> {
    const cacheKey = conn.name || 'default';
    if (this.modelCache.has(cacheKey)) return this.modelCache.get(cacheKey)!;

    // Explicit type assertion fixes Mongoose overload type issue
    const Model = conn.model(
      'MemberSharedAccess',
      MemberSharedAccessSchema,
      'member_shared_access',
    ) as unknown as mongoose.Model<MemberSharedAccess>;

    this.modelCache.set(cacheKey, Model);
    return Model;
  }

  /**
   * Create or update module-level or resource-level shares.
   */
  async createOrUpdateShare(
    conn: mongoose.Connection,
    ownerMemberId: string,
    moduleKey: string,
    resourceId: string | null,
    recipients: Array<{
      memberId: string;
      permissions?: { read?: boolean; update?: boolean; delete?: boolean };
      expiresAt?: string | null;
      note?: string | null;
    }>,
    note?: string | null,
  ) {
    if (!recipients || recipients.length === 0) {
      throw new ForbiddenException('No recipients provided');
    }

    const Model = this.getModel(conn);
    const now = new Date();

    // find or create doc for owner+module
    let doc = await Model.findOne({ owner_member_id: ownerMemberId, module_key: moduleKey });
    if (!doc) {
      doc = await Model.create({
        owner_member_id: ownerMemberId,
        module_key: moduleKey,
        module_shared_with: [],
        resource_shares: [],
        note: note || null,
      });
    }

    if (!resourceId) {
      // 🔹 Module-level share
      recipients.forEach((r) => {
        const existing = (doc.module_shared_with || []).find((m) => m.member_id === r.memberId);
        const entry = {
          member_id: r.memberId,
          permissions: {
            read: !!r.permissions?.read,
            update: !!r.permissions?.update,
            delete: !!r.permissions?.delete,
          },
          shared_at: now,
          expires_at: r.expiresAt ? new Date(r.expiresAt) : null,
          is_revoked: false,
          note: r.note || null,
        };

        if (existing) {
          Object.assign(existing, entry);
        } else {
          doc.module_shared_with.push(entry);
        }
      });
    } else {
      // 🔹 Resource-level share
      let resourceEntry = (doc.resource_shares || []).find(
        (rs) => String(rs.resource_id) === String(resourceId),
      );
      if (!resourceEntry) {
        resourceEntry = { resource_id: resourceId, shared_with: [] };
        doc.resource_shares.push(resourceEntry);
      }

      recipients.forEach((r) => {
        const existing = (resourceEntry.shared_with || []).find((s) => s.member_id === r.memberId);
        const entry = {
          member_id: r.memberId,
          permissions: {
            read: !!r.permissions?.read,
            update: !!r.permissions?.update,
            delete: !!r.permissions?.delete,
          },
          shared_at: now,
          expires_at: r.expiresAt ? new Date(r.expiresAt) : null,
          is_revoked: false,
          note: r.note || null,
        };

        if (existing) Object.assign(existing, entry);
        else resourceEntry.shared_with.push(entry);
      });
    }

    await doc.save();
    return doc.toObject();
  }

  /**
   * Revoke share for a specific recipient (module-level or resource-level)
   */
  async revokeShare(
    conn: mongoose.Connection,
    ownerMemberId: string,
    moduleKey: string,
    targetMemberId: string,
    resourceId?: string | null,
  ) {
    const Model = this.getModel(conn);
    const doc = await Model.findOne({ owner_member_id: ownerMemberId, module_key: moduleKey });
    if (!doc) throw new NotFoundException('Share document not found');

    let modified = false;

    if (!resourceId) {
      // module-level revoke
      const entry = (doc.module_shared_with || []).find((m) => m.member_id === targetMemberId);
      if (entry && !entry.is_revoked) {
        entry.is_revoked = true;
        modified = true;
      }
    } else {
      // resource-level revoke
      const resourceEntry = (doc.resource_shares || []).find(
        (r) => String(r.resource_id) === String(resourceId),
      );
      if (!resourceEntry) throw new NotFoundException('Resource share not found');

      const entry = (resourceEntry.shared_with || []).find(
        (s) => s.member_id === targetMemberId,
      );
      if (entry && !entry.is_revoked) {
        entry.is_revoked = true;
        modified = true;
      }
    }

    if (modified) await doc.save();
    return { success: modified };
  }

  /**
   * List all shares created by this member
   */
  async getSharesGiven(conn: mongoose.Connection, ownerMemberId: string) {
    const Model = this.getModel(conn);
    return Model.find({ owner_member_id: ownerMemberId }).lean();
  }

  /**
   * List all shares received by this member (module + resource level)
   */
  async getSharesReceived(conn: mongoose.Connection, recipientMemberId: string) {
    const Model = this.getModel(conn);

    const moduleMatches = await Model.find({
      'module_shared_with.member_id': recipientMemberId,
      is_revoked: false,
    }).lean();

    const resourceMatches = await Model.find({
      'resource_shares.shared_with.member_id': recipientMemberId,
      is_revoked: false,
    }).lean();

    return { moduleMatches, resourceMatches };
  }

  /**
   * Check whether recipient can perform action ('read' | 'update' | 'delete')
   * on an owner's module/resource.
   */
  async checkAccess(
    conn: mongoose.Connection,
    ownerMemberId: string,
    recipientMemberId: string,
    moduleKey: string,
    action: 'read' | 'update' | 'delete',
    resourceId?: string | null,
  ): Promise<{ allowed: boolean; matched?: any }> {
    const Model = this.getModel(conn);
    const now = new Date();

    const doc = await Model.findOne({
      owner_member_id: ownerMemberId,
      module_key: moduleKey,
      is_revoked: false,
    }).lean();

    if (!doc) return { allowed: false };

    // 🔹 Resource-level check
    if (resourceId && Array.isArray(doc.resource_shares)) {
      const resourceEntry = doc.resource_shares.find(
        (r) => String(r.resource_id) === String(resourceId),
      );
      if (resourceEntry && Array.isArray(resourceEntry.shared_with)) {
        const entry = resourceEntry.shared_with.find(
          (s) => s.member_id === recipientMemberId && !s.is_revoked,
        );
        if (
          entry &&
          (!entry.expires_at || new Date(entry.expires_at) > now) &&
          entry.permissions?.[action]
        ) {
          return { allowed: true, matched: { type: 'resource', entry } };
        }
      }
    }

    // 🔹 Module-level fallback
    if (Array.isArray(doc.module_shared_with)) {
      const entry = doc.module_shared_with.find(
        (s) => s.member_id === recipientMemberId && !s.is_revoked,
      );
      if (
        entry &&
        (!entry.expires_at || new Date(entry.expires_at) > now) &&
        entry.permissions?.[action]
      ) {
        return { allowed: true, matched: { type: 'module', entry } };
      }
    }

    return { allowed: false };
  }
}
