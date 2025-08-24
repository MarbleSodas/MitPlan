import { useState, createContext, useContext } from 'react';
import styled, { keyframes } from 'styled-components';
import { Check, X, AlertCircle, Info } from 'lucide-react';

// Animation keyframes
const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '768px'}) {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }
`;

const ToastItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return props.theme?.colors?.success || '#10b981';
      case 'error': return props.theme?.colors?.error || '#ef4444';
      case 'warning': return props.theme?.colors?.warning || '#f59e0b';
      case 'info':
      default: return props.theme?.colors?.primary || '#3399ff';
    }
  }};
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  animation: ${props => props.$isExiting ? slideOutRight : slideInRight} 0.3s ease;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '768px'}) {
    min-width: auto;
    max-width: none;
    width: 100%;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => {
    switch (props.$type) {
      case 'success': return props.theme?.colors?.success || '#10b981';
      case 'error': return props.theme?.colors?.error || '#ef4444';
      case 'warning': return props.theme?.colors?.warning || '#f59e0b';
      case 'info':
      default: return props.theme?.colors?.primary || '#3399ff';
    }
  }};
`;

const ToastContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  line-height: 1.2;
`;

const ToastMessage = styled.div`
  font-size: 13px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  line-height: 1.3;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.hoverBackground || '#f3f4f6'};
    color: ${props => props.theme?.colors?.text || '#1f2937'};
  }
`;

// Toast context and provider

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 4000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isExiting: true } : toast
    ));

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
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

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            $type={toast.type}
            $isExiting={toast.isExiting}
          >
            <IconWrapper $type={toast.type}>
              {getIcon(toast.type)}
            </IconWrapper>
            <ToastContent>
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.message && <ToastMessage>{toast.message}</ToastMessage>}
            </ToastContent>
            <CloseButton onClick={() => removeToast(toast.id)}>
              <X size={16} />
            </CloseButton>
          </ToastItem>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
