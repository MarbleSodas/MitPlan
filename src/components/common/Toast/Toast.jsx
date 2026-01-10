// Legacy Toast shim - redirects to Sonner
// This file exists for backward compatibility during migration
import { toast } from 'sonner';

// Create a hook-like interface that maps to sonner's toast
export const useToast = () => {
  return {
    addToast: ({ type, title, message }) => {
      if (type === 'success') {
        toast.success(title, { description: message });
      } else if (type === 'error') {
        toast.error(title, { description: message });
      } else if (type === 'warning') {
        toast.warning(title, { description: message });
      } else {
        toast.info(title, { description: message });
      }
    }
  };
};

export default useToast;
