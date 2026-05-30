declare module '@angular/common/http' {
  export class HttpHeaders {
    constructor(headers?: any);
    set(name: string, value: string | string[]): HttpHeaders;
    get(name: string): string | null;
  }
  export class HttpClient {
    get<T = any>(url: string, options?: any): any;
    post<T = any>(url: string, body: any, options?: any): any;
    put<T = any>(url: string, body: any, options?: any): any;
    delete<T = any>(url: string, options?: any): any;
  }
  export class HttpErrorResponse {
    status: number;
    message: string;
    error?: any;
    url?: string | null;
  }
  export type HttpInterceptorFn = (req: any, next: any) => any;
  export function provideHttpClient(...features: any[]): any;
  export function withInterceptors(interceptors: any[]): any;
}
