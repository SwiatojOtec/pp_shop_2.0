import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }) {
    return (
        <div
            className={cn('flex flex-col gap-1.5 p-6 pb-4', className)}
            {...props}
        />
    );
}

function CardTitle({ className, ...props }) {
    return (
        <h3
            className={cn('text-base font-bold leading-none tracking-tight text-gray-900', className)}
            {...props}
        />
    );
}

function CardContent({ className, ...props }) {
    return <div className={cn('p-6', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
    return (
        <div
            className={cn('flex items-center p-6 pt-0', className)}
            {...props}
        />
    );
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
