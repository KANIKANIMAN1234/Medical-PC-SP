import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ className, size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full border-indigo-500 border-t-transparent animate-spin',
          sizeClasses[size]
        )}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
