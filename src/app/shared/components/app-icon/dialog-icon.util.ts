export function dialogIconName(type: 'info' | 'warning' | 'error'): string {
  switch (type) {
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}
