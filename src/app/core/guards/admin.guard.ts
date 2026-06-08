import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiConfigService } from '../services/api-config.service';
import { hasAdminAccessRole } from '../utils/backend-contract.utils';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiConfig = inject(ApiConfigService);

  if (hasAdminAccessRole(authService.getCurrentSession()?.backendRole)) {
    return true;
  }

  apiConfig.triggerError('Bạn cần quyền ADMIN hoặc QUẢN_LÝ để truy cập chức năng này.');
  router.navigate(['/dashboard']);
  return false;
};
