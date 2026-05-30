import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiConfigService } from '../services/api-config.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiConfig = inject(ApiConfigService);

  const currentUser = authService.currentUser();

  if (currentUser && currentUser.role === 'admin') {
    return true;
  }

  // 1. Notify user politely
  apiConfig.triggerError('Quyền truy cập bị từ chối: Chỉ quản trị viên mới được phép vào phân hệ này.');

  // 2. Redirect to dashboard safely
  router.navigate(['/dashboard']);
  return false;
};
