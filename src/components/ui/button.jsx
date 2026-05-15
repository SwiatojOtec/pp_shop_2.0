import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60 cursor-pointer',
    {
        variants: {
            variant: {
                default:   'bg-[#e63946] text-white hover:bg-[#c62535] focus-visible:ring-[#e63946]',
                secondary: 'bg-white text-[#1a1a1a] border border-[#e0e0e0] hover:bg-gray-50 focus-visible:ring-gray-300',
                ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
                outline:   'border border-[#e0e0e0] bg-transparent text-[#1a1a1a] hover:bg-gray-50',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm:      'h-8 px-3 text-xs',
                lg:      'h-11 px-6 text-base',
                icon:    'h-9 w-9 p-0',
            },
        },
        defaultVariants: {
            variant: 'default',
            size:    'default',
        },
    }
);

const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
    />
));

Button.displayName = 'Button';

export { Button, buttonVariants };
