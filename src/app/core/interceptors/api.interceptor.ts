import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiConfigService } from '../services/api-config.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  let apiReq = req;

  if (req.url.startsWith('/')) {
    apiReq = req.clone({
      url: `${apiConfig.backendUrl()}${req.url}`
    });
  }

  const headers: Record<string, string> = {
    'X-Request-Id': crypto.randomUUID()
  };

  if (!apiConfig.isMockMode()) {
    const token = apiConfig.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  apiReq = apiReq.clone({ setHeaders: headers });

  return next(apiReq).pipe(
    catchError((err: HttpErrorResponse) => {
      let errorMsg = 'Da xay ra loi ket noi he thong.';

      if (err.status === 0) {
        errorMsg = 'Khong the ket noi Backend API tai http://localhost:8080.';
      } else if (err.status === 401) {
        errorMsg = 'Phien dang nhap da het han hoac khong hop le.';
        apiConfig.setToken(null);
      } else if (err.status === 403) {
        errorMsg = 'Ban khong co quyen thuc hien chuc nang nay.';
      } else if (err.status === 404) {
        errorMsg = 'Tai nguyen khong ton tai tren backend.';
      } else if (err.status >= 500) {
        errorMsg = `Loi may chu Backend (${err.status}).`;
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
