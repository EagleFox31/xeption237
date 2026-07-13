import { toast } from 'sonner';

export const notifyError = (message: string, description?: string) =>
  toast.error(message, { description });

export const notifySuccess = (message: string, description?: string) =>
  toast.success(message, { description });

export const notifyInfo = (message: string, description?: string) =>
  toast(message, { description });
