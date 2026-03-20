import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        success: 'bg-green-500/10 border-green-500 text-green-400',
        error: 'bg-red-500/10 border-red-500 text-red-400',
        info: 'bg-blue-500/10 border-blue-500 text-blue-400'
    };

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl backdrop-blur-md animate-in slide-in-from-right fade-in duration-300 ${styles[type]}`}>
            {icons[type]}
            <p className="font-medium text-sm">{message}</p>
            <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                <X size={16} />
            </button>
        </div>
    );
};