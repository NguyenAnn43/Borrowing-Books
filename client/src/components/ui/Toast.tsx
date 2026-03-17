"use client";

import { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(toast => toast.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
};

export const Toast: React.FC<Toast & { onClose: (id: string) => void }> = ({
    id,
    message,
    type,
    onClose,
}) => {
    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-700 dark:text-green-400',
                    icon: <CheckCircle2 className="w-5 h-5" />,
                };
            case 'error':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-700 dark:text-red-400',
                    icon: <AlertCircle className="w-5 h-5" />,
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    text: 'text-yellow-700 dark:text-yellow-400',
                    icon: <AlertCircle className="w-5 h-5" />,
                };
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-700 dark:text-blue-400',
                    icon: <Info className="w-5 h-5" />,
                };
        }
    };

    const styles = getStyles();

    return (
        <div
            className={`flex items-center gap-3 rounded-lg border ${styles.bg} ${styles.border} ${styles.text} p-4 mb-3 animate-in fade-in slide-in-from-top-2 duration-200`}
            role="alert"
        >
            {styles.icon}
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
                onClick={() => onClose(id)}
                className="ml-2 p-1 hover:opacity-70 transition-opacity"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({
    toasts,
    onClose,
}) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    );
};
