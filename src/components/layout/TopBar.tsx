import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap } from 'lucide-react';

interface Props {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function TopBar({ title, showBack = false, right }: Props) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/30 top-safe">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Zap size={16} className="text-white" />
            </div>
          </div>
        )}

        <h1 className="flex-1 text-white font-bold text-lg truncate">{title}</h1>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
