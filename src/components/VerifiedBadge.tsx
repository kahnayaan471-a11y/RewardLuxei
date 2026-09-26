import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  className = '',
  showTooltip = true
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-[18px] h-[18px]',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      title={showTooltip ? 'Verified Account' : undefined}
      aria-label="Verified Account"
    >
      <BadgeCheck
        className={`${sizeClasses[size]} text-white fill-[#1d9bf0] drop-shadow-sm`}
      />
    </span>
  );
};
