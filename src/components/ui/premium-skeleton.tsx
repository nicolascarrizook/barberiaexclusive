import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Enhanced skeleton with premium animations
export function PremiumSkeleton({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
}) {
  const variantClasses = {
    default: 'animate-pulse bg-muted',
    shimmer: 'animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer',
    pulse: 'animate-breathe bg-muted',
    wave: 'animate-pulse bg-muted relative overflow-hidden'
  };

  return (
    <div
      className={cn(
        'rounded-md',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {variant === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-right" />
      )}
    </div>
  );
}

// Specialized skeleton components for common layouts
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card border rounded-lg p-6 space-y-4', className)}>
      <PremiumSkeleton variant="shimmer" className="h-6 w-3/4" />
      <PremiumSkeleton variant="shimmer" className="h-4 w-full" />
      <PremiumSkeleton variant="shimmer" className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <PremiumSkeleton variant="shimmer" className="h-8 w-20" />
        <PremiumSkeleton variant="shimmer" className="h-8 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className }: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <PremiumSkeleton key={i} variant="shimmer" className="h-4 w-full" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <PremiumSkeleton 
              key={colIndex} 
              variant="shimmer" 
              className="h-8 w-full"
              style={{ animationDelay: `${(rowIndex + colIndex) * 0.05}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <PremiumSkeleton variant="shimmer" className="h-4 w-24" />
          <PremiumSkeleton variant="shimmer" className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <PremiumSkeleton variant="shimmer" className="h-10 w-24" />
        <PremiumSkeleton variant="shimmer" className="h-10 w-20" />
      </div>
    </div>
  );
}

export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <PremiumSkeleton variant="pulse" className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <PremiumSkeleton variant="shimmer" className="h-4 w-32" />
        <PremiumSkeleton variant="shimmer" className="h-3 w-24" />
      </div>
    </div>
  );
}

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <PremiumSkeleton variant="shimmer" className="h-8 w-48" />
        <PremiumSkeleton variant="shimmer" className="h-10 w-32" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <PremiumSkeleton variant="shimmer" className="h-6 w-40" />
          <TableSkeleton rows={6} columns={3} />
        </div>
        <div className="space-y-4">
          <PremiumSkeleton variant="shimmer" className="h-6 w-36" />
          <PremiumSkeleton variant="wave" className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Calendar header */}
      <div className="flex justify-between items-center">
        <PremiumSkeleton variant="shimmer" className="h-8 w-48" />
        <div className="flex gap-2">
          <PremiumSkeleton variant="shimmer" className="h-8 w-8" />
          <PremiumSkeleton variant="shimmer" className="h-8 w-8" />
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Days of week */}
        {Array.from({ length: 7 }).map((_, index) => (
          <PremiumSkeleton key={index} variant="shimmer" className="h-8 w-full" />
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: 35 }).map((_, index) => (
          <PremiumSkeleton 
            key={index} 
            variant="pulse" 
            className="h-12 w-full"
            style={{ animationDelay: `${index * 0.02}s` }}
          />
        ))}
      </div>
    </div>
  );
}