import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

export function ErrorMessage({ message = 'エラーが発生しました', className }: ErrorMessageProps) {
  return (
    <div className={cn('flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg text-sm', className)}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}
