import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newItem: NotificationItem = { id, type, message, duration };

      setNotifications((prev) => [...prev, newItem]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => showNotification('success', message, duration),
    [showNotification]
  );

  const showError = useCallback(
    (message: string, duration?: number) => showNotification('error', message, duration),
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => showNotification('info', message, duration),
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => showNotification('warning', message, duration),
    [showNotification]
  );

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
      case 'error':
        return 'border-red-500/30 bg-red-50/90 dark:bg-red-950/40 text-red-900 dark:text-red-200';
      case 'warning':
        return 'border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200';
      case 'info':
      default:
        return 'border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200';
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        dismiss,
      }}
    >
      {children}

      {/* Floating Notifications Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3"
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            role={n.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur text-xs font-medium transition-all animate-in slide-in-from-bottom-3 duration-200 ${getBorderColor(
              n.type
            )}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {renderIcon(n.type)}
              <span className="truncate">{n.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
