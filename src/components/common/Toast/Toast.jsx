import { useState, createContext, useContext } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type: 'info', duration: 4000, ...toast };
    setToasts((prev) => [...prev, newToast]);
    if (newToast.duration > 0) setTimeout(() => removeToast(id), newToast.duration);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <Check size={20} />;
      case 'error': return <X size={20} />;
      case 'warning': return <AlertCircle size={20} />;
      case 'info':
      default: return <Info size={20} />;
    }
  };

  const borderFor = (type) => {
    switch (type) {
      case 'success': return colors.success || '#10b981';
      case 'error': return colors.error || '#ef4444';
      case 'warning': return colors.warning || '#f59e0b';
      case 'info':
      default: return colors.primary || '#3399ff';
    }
  };

  const iconColorFor = borderFor;

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-4 rounded-xl shadow-xl min-w-[300px] max-w-[400px] border pointer-events-auto transition-all duration-300 bg-white dark:bg-neutral-900 border-[var(--toast-border-color)] ${toast.isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            style={{ '--toast-border-color': borderFor(toast.type) }}
          >
            <div className="w-6 h-6 flex items-center justify-center text-[var(--icon-color)]" style={{ '--icon-color': iconColorFor(toast.type) }}>
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              {toast.title && <div className="font-semibold text-[14px] leading-tight text-neutral-900 dark:text-neutral-100">{toast.title}</div>}
              {toast.message && <div className="text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">{toast.message}</div>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100"
              aria-label="Close"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
