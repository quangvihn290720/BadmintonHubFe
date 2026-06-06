export const environment = {
  production: true,
  backendUrl: (window as any).__BADMINTONHUB_CONFIG__?.backendUrl || 'https://badmintonhubbe.onrender.com',
  apiBaseUrl: (window as any).__BADMINTONHUB_CONFIG__?.apiBaseUrl || 'https://badmintonhubbe.onrender.com/api/v1',
  useMockApi: false
};
