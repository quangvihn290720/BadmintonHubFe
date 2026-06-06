export const environment = {
  production: true,
  backendUrl: (window as any).__BADMINTONHUB_CONFIG__?.backendUrl || 'http://localhost:8080',
  apiBaseUrl: (window as any).__BADMINTONHUB_CONFIG__?.apiBaseUrl || 'http://localhost:8080/api/v1',
  useMockApi: false
};
