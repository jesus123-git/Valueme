import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Option { value: string; label: string }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  placeholder?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...props }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border px-4 py-2.5 text-sm bg-white text-slate-900',
            'transition-colors duration-150 appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-slate-300 hover:border-slate-400',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
export default Select;
