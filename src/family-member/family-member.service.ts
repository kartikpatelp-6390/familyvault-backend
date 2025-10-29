import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { FamilyMemberSchema } from './schemas/family-member.schema';
import { BankAccountSchema } from '../bank-account/schemas/bank-account.schema';
import { decryptData, getTenantEncryptionKey } from '../utils/encryption.utils';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { EncryptionPlugin } from '../common/plugins/encryption.plugin';


@Injectable()
export class FamilyMemberService {
  private modelCache = new Map<string, mongoose.Model<any>>();

  private getModel(conn: mongoose.Connection) {
    if (this.modelCache.has(conn.name)) {
      return this.modelCache.get(conn.name)!;
    }

    let FamilyModel: mongoose.Model<any>;
    if (conn.models['FamilyMember']) {
      FamilyModel = conn.models['FamilyMember'];
    } else {
      const schema = FamilyMemberSchema.clone();
      // (Optional) If FamilyMember has sensitive fields, add plugin for them
      schema.plugin(EncryptionPlugin, []);
      FamilyModel = conn.model('FamilyMember', schema);
    }

    if (!conn.models['BankAccount']) {
      const bankSchema = BankAccountSchema.clone();
      bankSchema.plugin(EncryptionPlugin, ['accountNumber', 'ifsc']);
      conn.model('BankAccount', bankSchema);
    }

    // Cache the FamilyMember model
    this.modelCache.set(conn.name, FamilyModel);

    return FamilyModel;

    // if (!conn.models['FamilyMember']) {
    //   conn.model('FamilyMember', FamilyMemberSchema);
    // }
    // if (!conn.models['BankAccount']) {
    //   conn.model('BankAccount', BankAccountSchema);
    // }
    // return conn.model('FamilyMember');
  }

  async create(conn: mongoose.Connection, dto: CreateFamilyMemberDto) {
    const FamilyMember = this.getModel(conn);
    // return await Member.create(dto);

    // Check for duplicate email
    const existing = await FamilyMember.findOne({ email: dto.email });
    if (existing) throw new BadRequestException('Family member with this email already exists');

    // Ensure password exists (optional design)
    if (!dto.password || typeof dto.password !== 'string') {
      throw new BadRequestException('Password is required to create a login-enabled family member');
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, salt)
      : null;

    const newMember = await FamilyMember.create({
      ...dto,
      passwordHash,
    });

    return {
      message: 'Family member created successfully',
      newMember
    };
  }

  async findAll(conn: mongoose.Connection, tenantId: string) {
    const Member = this.getModel(conn) as mongoose.Model<any>;
    return await Member.find()
      .populate({ path: 'bankAccounts', options: { tenantId } })
      .setOptions({ tenantId }) // 🔑 triggers decryption for populated bank accounts
      .sort({ createdAt: -1 })
      .lean();

    // const Member = this.getModel(conn);
    // return await Member.find().populate('bankAccounts').sort({ createdAt: -1 }).lean();
  }

  async findOne(conn: mongoose.Connection, id: string, tenantId: string) {
    const Member = this.getModel(conn);
    const member = await Member.findById(id).populate({ path: 'bankAccounts', options: { tenantId } }).setOptions({ tenantId }).lean();
    if (!member) throw new NotFoundException('Family member not found');
    return member;
  }

  async update(conn: mongoose.Connection, id: string, dto: UpdateFamilyMemberDto) {
    // const Member = this.getModel(conn);
    // const updated = await Member.findByIdAndUpdate(id, dto, { new: true });
    // if (!updated) throw new NotFoundException('Family member not found');
    // return updated;

    const FamilyMember = this.getModel(conn);
    const member = await FamilyMember.findById(id);
    if (!member) throw new NotFoundException('Family member not found');

    // 🔒 Only update password if provided
    let updateData: any = { ...dto };
    if (dto.password && dto.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(dto.password, salt);
    }
    delete updateData.password;

    const updated = await FamilyMember.findByIdAndUpdate(id, updateData, { new: true });
    return { message: 'Family member updated successfully', member: updated };
  }

  async remove(conn: mongoose.Connection, id: string) {
    const Member = this.getModel(conn);
    const deleted = await Member.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Family member not found');
    return { message: 'Family member deleted successfully' };
  }
}
