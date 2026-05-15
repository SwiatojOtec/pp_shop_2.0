import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Select = forwardRef(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#e63946] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            className
        )}
        {...props}
    >
        {children}
    </select>
));

Select.displayName = 'Select';

export { Select };
