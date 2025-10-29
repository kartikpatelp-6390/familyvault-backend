import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import mongoose from 'mongoose';

@Injectable()
export class TenantAwareInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId || null;

    return next.handle().pipe(
      map((data) => {
        if (!tenantId || typeof data !== 'object') return data;

        const attachTenantId = (obj: any): any => {
          if (Array.isArray(obj)) {
            return obj.map((item) => attachTenantId(item));
          }

          // 🧠 Only attach _tenantId to plain JSON objects
          if (
            obj &&
            typeof obj === 'object' &&
            !(obj instanceof mongoose.Document) && // skip Mongoose docs
            !Object.getOwnPropertyDescriptor(obj, '_tenantId')
          ) {
            Object.defineProperty(obj, '_tenantId', {
              value: tenantId,
              writable: true,
              enumerable: false, // don’t show in JSON
              configurable: true,
            });

            // Recursively go deeper (plain sub-objects only)
            for (const key of Object.keys(obj)) {
              const val = obj[key];
              if (val && typeof val === 'object' && !(val instanceof mongoose.Document)) {
                obj[key] = attachTenantId(val);
              }
            }
          }

          return obj;
        };

        // If data is an array of documents, convert to JSON first
        if (Array.isArray(data)) {
          return data.map((item) =>
            item instanceof mongoose.Document ? attachTenantId(item.toJSON()) : attachTenantId(item),
          );
        }

        // Single document
        return data instanceof mongoose.Document ? attachTenantId(data.toJSON()) : attachTenantId(data);
      }),
    );
  }
}
