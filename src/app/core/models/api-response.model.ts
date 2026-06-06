export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}
