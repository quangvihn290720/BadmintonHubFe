import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiConfigService } from '../services/api-config.service';
import { AuthService } from '../services/auth.service';
import { getFriendlyErrorMessage } from '../constants/error-messages';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  const authService = inject(AuthService);
  let apiReq = req;
  const isLoginRequest = req.url.includes('/auth/login');

  if (req.url.startsWith('/')) {
    apiReq = req.clone({
      url: `${apiConfig.backendUrl()}${req.url}`
    });
  }

  const headers: Record<string, string> = {
    'X-Request-Id': crypto.randomUUID()
  };

  if (!apiConfig.isMockMode() && !isLoginRequest) {
    const token = apiConfig.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  apiReq = apiReq.clone({ setHeaders: headers });

  return next(apiReq).pipe(
    catchError((err: HttpErrorResponse) => {
      let errorMsg = 'Đã xảy ra lỗi kết nối hệ thống.';

      if (err.status === 0) {
        errorMsg = 'Không thể kết nối đến máy chủ Backend.';
      } else if (err.status === 401) {
        if (req.url.includes('/auth/login')) {
          errorMsg = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
        } else {
          errorMsg = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.';
          authService.logout();
        }
      } else if (err.status === 403) {
        errorMsg = 'Bạn không có quyền thực hiện chức năng này.';
      } else if (err.status === 404) {
        errorMsg = 'Tài nguyên không tồn tại trên hệ thống.';
      } else if (err.status >= 500) {
        errorMsg = `Lỗi máy chủ hệ thống (${err.status}).`;
      } else if (err.error && typeof err.error === 'object') {
        const errObj = err.error as { code?: string; message?: string };
        errorMsg = getFriendlyErrorMessage(errObj.code, errObj.message);
      } else if (err.message) {
        errorMsg = err.message;
      }

      if (!req.url.includes('/auth/login')) {
        apiConfig.triggerError(errorMsg);
      }
      return throwError(() => err);
    })
  );
};
