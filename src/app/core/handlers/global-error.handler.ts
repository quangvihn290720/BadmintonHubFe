import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ApiConfigService } from '../services/api-config.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly apiConfig = inject(ApiConfigService);

  handleError(error: any): void {
    // 1. Log full details in Console for debugging
    console.error('Unhandled Frontend Exception Caught:', error);

    // 2. Extrapolate error message
    const message = error instanceof Error ? error.message : String(error);

    // 3. Trigger global slide-in toast to notify user politely
    this.apiConfig.triggerError(`Lỗi ứng dụng cục bộ: ${message}`);
  }
}
