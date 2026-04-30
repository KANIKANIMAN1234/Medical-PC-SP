import { cn, getJudgmentColor, getJudgmentLabel } from '@/lib/utils';
import type { JudgmentLevel } from '@/types/app';

interface JudgmentBadgeProps {
  judgment: JudgmentLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function JudgmentBadge({ judgment, showLabel = true, size = 'md' }: JudgmentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        getJudgmentColor(judgment),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      {showLabel ? getJudgmentLabel(judgment) : judgment}
    </span>
  );
}
