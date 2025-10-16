import { environment } from '../../../environments/environment';

class Logger {
  private isDevelopment = !environment.production;

  log(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }

  debug(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger();
