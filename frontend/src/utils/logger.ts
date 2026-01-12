/**
 * Logger utility for frontend
 * In development: logs to console
 * In production: can send to remote logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // In development, use console
      switch (level) {
        case 'debug':
          console.debug(...args);
          break;
        case 'info':
          console.info(...args);
          break;
        case 'warn':
          console.warn(...args);
          break;
        case 'error':
          console.error(...args);
          break;
      }
    } else {
      // In production, only log errors (can extend to send to remote service)
      if (level === 'error') {
        // TODO: Send to remote logging service (Sentry, LogRocket, etc.)
        console.error(...args);
      }
    }
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args);
  }

  info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  error(...args: unknown[]): void {
    this.log('error', ...args);
  }
}

export const logger = new Logger();
