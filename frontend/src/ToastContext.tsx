import { createContext, ReactNode, useContext, useState } from "react";
import "./style/toast.css";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ToastContextValue = {
    showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    function showToast(message: string, type: ToastType = "info") {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { id, message, type }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 4500);
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-region" aria-live="polite" aria-atomic="true">
                {toasts.map((toast) => (
                    <div className={`toast toast-${toast.type}`} key={toast.id}>
                        <span>{toast.message}</span>
                        <button
                            aria-label="Dismiss notification"
                            onClick={() =>
                                setToasts((current) =>
                                    current.filter((item) =>
                                        item.id !== toast.id
                                    )
                                )}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used inside ToastProvider");
    return context;
}
