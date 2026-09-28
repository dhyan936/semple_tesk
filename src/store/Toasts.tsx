import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Check, Info, Trash2, X } from 'lucide-react';

type Tone = 'success' | 'info' | 'danger';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
  leaving?: boolean;
}

type Push = (message: string, options?: { tone?: Tone; action?: Toast['action'] }) => void;

const ToastContext = createContext<Push>(() => {});

const DURATION = 4000;
const icons = { success: Check, info: Info, danger: Trash2 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 200);
  }, []);

  const push = useCallback<Push>(
    (message, options = {}) => {
      const id = nextId.current++;
      // Keep the stack short so feedback never piles up over the content.
      setToasts((all) => [...all.slice(-2), { id, message, tone: options.tone ?? 'success', action: options.action }]);
      window.setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toaster" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className={`toast toast--${t.tone}${t.leaving ? ' is-leaving' : ''}`}>
              <span className="toast__icon" aria-hidden>
                <Icon size={14} strokeWidth={2.5} />
              </span>
              <span className="toast__message">{t.message}</span>
              {t.action && (
                <button
                  className="toast__action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button className="toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
