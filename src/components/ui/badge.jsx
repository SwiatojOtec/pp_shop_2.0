import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
        variants: {
            variant: {
                default:  'bg-[#e63946] text-white',
                secondary:'bg-gray-100 text-gray-800',
                success:  'bg-emerald-100 text-emerald-800',
                warning:  'bg-amber-100 text-amber-800',
                danger:   'bg-red-100 text-red-800',
                outline:  'border border-gray-200 text-gray-700',
                sale:     'bg-[#e63946] text-white',
                new:      'bg-emerald-500 text-white',
                hot:      'bg-orange-400 text-white',
                top:      'bg-[#264653] text-white',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

function Badge({ className, variant, ...props }) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
