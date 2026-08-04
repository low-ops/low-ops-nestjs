import { LoggerService } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

function getSpanContext() {
  try {
    return trace.getActiveSpan()?.spanContext();
  } catch {
    return undefined;
  }
}

function writeEntry(
  level: string,
  message: unknown,
  ctx?: string,
  stack?: string,
): void {
  const spanCtx = getSpanContext();
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };
  if (ctx) entry['context'] = ctx;
  if (stack) entry['stack'] = stack.replace(/\r?\n/g, ' ');
  if (spanCtx?.traceId) entry['trace_id'] = spanCtx.traceId;
  if (spanCtx?.spanId) entry['span_id'] = spanCtx.spanId;
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    writeEntry('info', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    writeEntry('error', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    writeEntry('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    writeEntry('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    writeEntry('debug', message, context);
  }

  fatal(message: unknown, context?: string): void {
    writeEntry('error', message, context);
  }
}
