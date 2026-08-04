import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const res: Response = context.switchToHttp().getResponse();
        const contentType = res.getHeader('content-type') as string | undefined;
        if (
          contentType?.includes('text/html') ||
          contentType?.includes('application/json')
        ) {
          res.setHeader('Cache-Control', 'no-store');
        }
      }),
    );
  }
}
