import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, type, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    // Para inputs de contraseña añadimos un botón "ojo" que alterna la visibilidad.
    const isPassword = type === 'password';
    const [revealed, setRevealed] = useState(false);
    const effectiveType = isPassword ? (revealed ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={cn(
              'w-full rounded-lg border px-4 py-2.5 text-sm',
              isPassword && 'pr-11',
              'text-slate-900 dark:text-slate-100',
              'bg-white dark:bg-slate-700',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'dark:focus:ring-emerald-400',
              error
                ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              tabIndex={-1}
              aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
