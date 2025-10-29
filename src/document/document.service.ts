import { Injectable, NotFoundException, ForbiddenException, StreamableFile } from '@nestjs/common';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { DocumentSchema } from './schemas/document.schema';
import { FamilyMemberSchema } from '../family-member/schemas/family-member.schema';
import { ShareDocumentDto } from './dto/share-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentAccessDto } from './dto/update-document-access.dto';

@Injectable()
export class DocumentService {
  private getModel(conn: mongoose.Connection) {
    return conn.model('Document', DocumentSchema);
  }

  private getTenantFolder(tenantId: string) {
    return path.join(process.cwd(), 'uploads', `tenant_${tenantId}`);
  }

  private async updateTenantUsage(tenantFolder: string, delta: number) {
    const usageFile = path.join(tenantFolder, 'usage.json');
    let usage = { totalSize: 0 };

    try {
      const data = await fs.readFile(usageFile, 'utf8');
      usage = JSON.parse(data);
    } catch (err) {
      // file not found – initialize new
      usage = { totalSize: 0 };
    }

    usage.totalSize = Math.max(usage.totalSize + delta, 0);
    await fs.writeFile(usageFile, JSON.stringify(usage, null, 2), 'utf8');
  }

  private async ensureFolderExists(folderPath: string) {
    await fs.mkdir(folderPath, { recursive: true });
  }

  async uploadDocument(conn: mongoose.Connection, tenantId: string, file: Express.Multer.File, dto: UploadDocumentDto, uploaderId: string | null) {
    const FamilyMember = conn.model('FamilyMember', FamilyMemberSchema);
    const member = await FamilyMember.findById(uploaderId);
    if (!member) {
      throw new NotFoundException('Family member not found');
    }

    const tenantFolder = this.getTenantFolder(tenantId);
    const memberFolder = uploaderId ? path.join(tenantFolder, 'members', uploaderId) : path.join(tenantFolder, 'shared');

    await this.ensureFolderExists(memberFolder);

    const filePath = path.join(memberFolder, file.originalname);
    await fs.writeFile(filePath, file.buffer);

    const Document = this.getModel(conn);
    const document = await Document.create({
      memberId: uploaderId,
      uploadedBy: member.name,
      uploadedById: member._id,
      fileName: dto.fileName || file.originalname,
      filePath,
      mimeType: file.mimetype,
      size: file.size,
      accessControl: {
        type: dto.accessType || 'private',
        sharedWith: dto.sharedWith || [],
      },
      documentType: dto.documentType || '',
    });

    // update tenant usage
    await this.updateTenantUsage(tenantFolder, file.size);

    return {
      message: 'Document uploaded successfully',
      document,
    };
  }

  async getDocuments(conn: mongoose.Connection, memberId?: string) {
    const Document = this.getModel(conn);
    const filter = memberId ? { memberId } : {};
    const docs = await Document.find(filter).sort({ createdAt: -1 }).lean();
    return docs;
  }

  async getTenantUsage(tenantId: string) {
    const usageFile = path.join(this.getTenantFolder(tenantId), 'usage.json');
    try {
      const data = await fs.readFile(usageFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { totalSize: 0 };
    }
  }

  async deleteDocument(conn: mongoose.Connection, tenantId: string, id: string) {
    const Document = this.getModel(conn);
    const doc = await Document.findById(id);
    if (!doc) throw new NotFoundException('Document not found');

    try {
      await fs.unlink(doc.filePath);
    } catch {}

    const tenantFolder = this.getTenantFolder(tenantId);
    await this.updateTenantUsage(tenantFolder, -(doc.size || 0));
    await doc.deleteOne();

    return { message: 'Document deleted successfully' };
  }

  async updateAccess(
    conn: mongoose.Connection,
    docId: string,
    dto: { fileName?: string, accessType: 'private' | 'shared' | 'public'; sharedWith?: string[]; documentType?: string },
    requesterMemberId: string,
  ) {
    const Document = this.getModel(conn);
    const doc = await Document.findById(docId);

    if (!doc) throw new NotFoundException('Document not found');

    // Only uploader can change access
    if (doc.uploadedById && doc.uploadedById !== requesterMemberId) {
      throw new ForbiddenException('You are not allowed to change sharing settings for this document.');
    }

    // Normalize input (clean up data)
    const newAccessType = dto.accessType || 'private';
    const newSharedList = newAccessType === 'shared' ? dto.sharedWith || [] : [];

    doc.fileName = dto.fileName || doc.fileName;
    doc.accessControl = {
      type: newAccessType,
      sharedWith: newSharedList,
    };
    doc.documentType = dto.documentType || '';

    await doc.save();

    return {
      message: `Access successfully updated to '${newAccessType}'`,
      document: {
        id: doc._id,
        fileName: doc.fileName,
        accessControl: doc.accessControl,
        updatedAt: doc.updatedAt,
      },
    };
  }

  async downloadDocument(conn: mongoose.Connection, tenantId: string, docId: string, requesterMemberId: string) {
    const Document = this.getModel(conn);
    const doc = await Document.findById(docId);

    if (!doc) throw new NotFoundException('Document not found');

    // Access Control Checks
    const accessType = doc.accessControl?.type || 'private';
    const sharedWith = doc.accessControl?.sharedWith || [];

    if (accessType === 'private') {
      if (doc.uploadedById && doc.uploadedById !== requesterMemberId) {
        throw new ForbiddenException('You do not have permission to access this document.');
      }
    } else if (accessType === 'shared') {
      if (!sharedWith.includes(requesterMemberId) && doc.uploadedById !== requesterMemberId) {
        throw new ForbiddenException('You are not authorized to access this shared document.');
      }
    }
    // public: no restriction

    // Validate file exists
    try {
      await fs.access(doc.filePath);
    } catch {
      throw new NotFoundException('File not found on server');
    }

    // Compute absolute path (clean path.join)
    const absolutePath = path.resolve(doc.filePath);

    return {
      message: 'Document information retrieved successfully',
      document: {
        id: doc._id,
        memberId: doc.memberId,
        uploadedBy: doc.uploadedBy,
        uploadedById: doc.uploadedById,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        accessControl: doc.accessControl,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      fileInfo: {
        relativePath: path.relative(process.cwd(), doc.filePath),
        absolutePath,
        tenantFolder: this.getTenantFolder(tenantId),
      },
    };
  }

  async getStats(conn: mongoose.Connection) {
    try {
      const Document = this.getModel(conn);
      const allDocs = await Document.find().lean();

      const counts = {
        images: 0,
        pdfs: 0,
        videos: 0,
        docs: 0,
        excels: 0,
        others: 0,
      };

      for (const doc of allDocs) {
        const type = this.mapMimeToType(doc.mimeType);
        if (type === 'image') counts.images++;
        else if (type === 'pdf') counts.pdfs++;
        else if (type === 'video') counts.videos++;
        else if (type === 'doc') counts.docs++;
        else if (type === 'excel') counts.excels++;
        else counts.others++;
      }

      return counts;
    } catch (e) {
      console.log(e);
    }
  }

  private mapMimeToType(mime?: string | null) {
    if (!mime) return 'other';
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('video/')) return 'video';
    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'text/plain'
    )
      return 'doc';

    if (
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
      return 'excel';

    return 'other';
  }
}
