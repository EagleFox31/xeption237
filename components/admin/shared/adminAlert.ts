export type AdminAlertFn = (
  title: string,
  message: string,
  type?: 'danger' | 'info' | 'success',
) => void;
