import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { PremiumSpinner, LoadingDots } from '@/components/ui/premium-loader';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  loadingVariant?: 'spinner' | 'dots';
  icon?: React.ReactNode;
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  loadingVariant = 'spinner',
  icon,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Button
      disabled={isDisabled}
      className={cn(
        'relative transition-all duration-200',
        loading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadingVariant === 'spinner' ? (
            <PremiumSpinner size="sm" />
          ) : (
            <LoadingDots />
          )}
        </div>
      )}
      
      {/* Content */}
      <div
        className={cn(
          'flex items-center gap-2 transition-opacity duration-200',
          loading && 'opacity-0'
        )}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{loading && loadingText ? loadingText : children}</span>
      </div>
    </Button>
  );
}

// Specialized variants for common use cases
export function SaveButton({ loading, ...props }: Omit<LoadingButtonProps, 'loadingText'>) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Guardando..."
      {...props}
    />
  );
}

export function SubmitButton({ loading, ...props }: Omit<LoadingButtonProps, 'loadingText'>) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Enviando..."
      type="submit"
      {...props}
    />
  );
}

export function DeleteButton({ loading, ...props }: Omit<LoadingButtonProps, 'loadingText' | 'variant'>) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Eliminando..."
      variant="destructive"
      {...props}
    />
  );
}

export function RefreshButton({ loading, ...props }: Omit<LoadingButtonProps, 'loadingText' | 'loadingVariant'>) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Actualizando..."
      loadingVariant="spinner"
      {...props}
    />
  );
}