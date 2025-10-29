import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { BankAccountSchema } from './schemas/bank-account.schema';
import { decryptData, getTenantEncryptionKey } from '../utils/encryption.utils';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { EncryptionPlugin } from '../common/plugins/encryption.plugin';

@Injectable()
export class BankAccountService {
  private modelCache = new Map<string, mongoose.Model<any>>();

  private getModel(conn: mongoose.Connection) {
    if (this.modelCache.has(conn.name)) {
      return this.modelCache.get(conn.name)!;
    }

    if (conn.models['BankAccount']) {
      const model = conn.model('BankAccount');
      this.modelCache.set(conn.name, model);
      return model;
    }

    const schema = BankAccountSchema.clone();

    schema.plugin(EncryptionPlugin, ['accountNumber', 'ifsc']);

    return conn.model('BankAccount', schema);
  }

  async create(conn: mongoose.Connection, dto: CreateBankAccountDto, tenantId: string) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;

    // Step 1: Check for duplicate accountNumber (use plain text comparison)
    const existing = await BankAccountModel.find().setOptions({ tenantId });
    for (const acc of existing) {
      // decrypt each accountNumber for comparison
      const tenantKey = getTenantEncryptionKey(tenantId);
      const decryptedAccountNumber = decryptData(acc.accountNumber, tenantKey);
      if (decryptedAccountNumber === dto.accountNumber) {
        throw new BadRequestException('Bank Account number already exists');
      }
    }

    // Step 2: Create new record
    const newBankAccount = new BankAccountModel(dto);
    newBankAccount.setTenantContext(tenantId);

    await newBankAccount.save();

    // Step 3: Decrypt before sending response
    const tenantKey = getTenantEncryptionKey(tenantId);
    const responseObj = newBankAccount.toObject();
    for (const field of ['accountNumber', 'ifsc']) {
      if (responseObj[field]) {
        try {
          responseObj[field] = decryptData(responseObj[field], tenantKey);
        } catch {
          // skip if already decrypted or invalid
        }
      }
    }

    return {
      message: 'Bank account created successfully',
      responseObj,
    };

  }

  async findAll(conn: mongoose.Connection, tenantId: string) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;
    return await BankAccountModel.find().setOptions({ tenantId }).sort({ createdAt: -1 });
  }

  async findAllByMember(conn: mongoose.Connection, memberId: string) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;

    return await BankAccountModel.find({ memberId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(conn: mongoose.Connection, id: string, tenantId: string) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;
    return await BankAccountModel.findById(id).setOptions({ tenantId }).exec();
  }

  async update(conn: mongoose.Connection, id: string, dto: UpdateBankAccountDto) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;
    dto['updatedAt'] = new Date();
    const updated = await BankAccountModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    return { message: 'Bank account updated successfully', bankAccount: updated };
  }

  async remove(conn: mongoose.Connection, id: string) {
    const BankAccountModel = this.getModel(conn) as mongoose.Model<any>;
    const deleted = await BankAccountModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Bank Account not found');
    return { message: 'Bank account deleted successfully' };
  }
}
