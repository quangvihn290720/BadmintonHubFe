import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfigService } from '../services/api-config.service';
import { environment } from '../../../environments/environment';
import { catchError, throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  let apiReq = req;

  // 1. Prefix local paths starting with '/'
  if (req.url.startsWith('/')) {
    apiReq = req.clone({
      url: `${environment.backendUrl}${req.url}`
    });
  }

  // 2. Inject JWT auth token in Online mode
  if (!apiConfig.isMockMode()) {
    const token = apiConfig.token();
    if (token) {
      apiReq = apiReq.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  // 3. Centralized HTTP error handling
  return next(apiReq).pipe(
    catchError((err: HttpErrorResponse) => {
      let errorMsg = 'Đã xảy ra lỗi kết nối hệ thống.';

      if (err.status === 0) {
        errorMsg = 'Không thể kết nối đến Backend API port 4201. Vui lòng kiểm tra lại server.';
      } else if (err.status === 401) {
        errorMsg = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
        // Optional: clear credentials or redirect
      } else if (err.status === 403) {
        errorMsg = 'Quyền truy cập bị từ chối: Bạn không có quyền thực hiện chức năng này.';
      } else if (err.status === 404) {
        errorMsg = `Tài nguyên không tìm thấy trên server (Mã 404).`;
      } else if (err.status >= 500) {
        errorMsg = `Lỗi máy chủ Backend (Mã lỗi ${err.status}).`;
      } else if (err.error && typeof err.error === 'object' && err.error.message) {
        errorMsg = err.error.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      apiConfig.triggerError(errorMsg);
      return throwError(() => err);
    })
  );
};
