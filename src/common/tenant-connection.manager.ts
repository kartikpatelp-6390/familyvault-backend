import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';

@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionManager.name);
  private readonly connections = new Map<string, Connection>();
  private readonly baseUri = process.env.MONGO_URI || 'mongodb://localhost:27017';

  getDbName(tenantId: string): string {
    return `familyvault_tenant_${tenantId}`;
  }

  async getOrCreateConnection(tenantId: string): Promise<Connection> {
    const dbName = this.getDbName(tenantId);
    const existing = this.connections.get(dbName);
    if (existing) return existing;

    const uri = `${this.baseUri}/${dbName}`;
    this.logger.log(`🔗 Creating connection for tenant: ${dbName}`);
    const conn = await mongoose.createConnection(uri).asPromise();
    this.connections.set(dbName, conn);
    return conn;
  }

  async closeConnection(tenantId: string): Promise<void> {
    const dbName = this.getDbName(tenantId);
    const conn = this.connections.get(dbName);
    if (conn) {
      await conn.close();
      this.connections.delete(dbName);
    }
  }

  async onModuleDestroy() {
    for (const [, conn] of this.connections.entries()) {
      try {
        await conn.close();
      } catch {}
    }
    this.connections.clear();
  }

  getModel(conn: mongoose.Connection, name: string, schema: mongoose.Schema): mongoose.Model<any> {
    // If the model is already compiled on this connection, reuse it
    if (conn.models[name]) return conn.models[name];
    // Otherwise register it with the schema that already has the plugin attached
    console.log(`🔗 Registering model '${name}' for tenant DB: ${conn.name}`);
    return conn.model(name, schema);
  }
}
