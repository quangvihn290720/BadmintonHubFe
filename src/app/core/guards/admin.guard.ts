import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiConfigService } from '../services/api-config.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiConfig = inject(ApiConfigService);

  if (authService.hasAnyRole(['ADMIN', 'MANAGER'])) {
    return true;
  }

  apiConfig.triggerError('Ban can quyen ADMIN hoac MANAGER de truy cap chuc nang nay.');
  router.navigate(['/dashboard']);
  return false;
};
