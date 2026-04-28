import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', loading = false, variant = 'danger'
}: Props) {
  const btnCls = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center
                        ${variant === 'danger' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
          <AlertTriangle size={28} className={variant === 'danger' ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${btnCls}`}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
