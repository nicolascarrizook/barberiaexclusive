import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'gradient';
}

// Premium animated barbershop logo
export const BarberShopLogo: React.FC<LoaderProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Scissors icon with animation */}
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 animate-scissors"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M32 8L24 24L32 32L40 24L32 8Z"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="24"
          cy="40"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          fill="none"
        />
        <path
          d="M32 32V48"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Rotating rings */}
      <div className="absolute inset-0 animate-spin-slow">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      </div>
      <div className="absolute inset-0 animate-spin-reverse">
        <div className="absolute inset-0 rounded-full border-2 border-t-primary/60 border-r-transparent border-b-transparent border-l-transparent" />
      </div>
    </div>
  );
};

// Premium progress bar with gradient
export const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ 
  progress, 
  className 
}) => {
  return (
    <div className={cn('relative h-2 bg-gray-200 rounded-full overflow-hidden', className)}>
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500 ease-out rounded-full"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-shimmer" />
      </div>
    </div>
  );
};

// Stage-based progress indicator
export const StageProgress: React.FC<{
  stages: string[];
  currentStage: number;
  className?: string;
}> = ({ stages, currentStage, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {stages.map((stage, index) => {
        const isActive = index === currentStage;
        const isCompleted = index < currentStage;
        
        return (
          <div key={stage} className="flex items-center space-x-3">
            <div className="relative">
              <div
                className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-primary border-primary text-white',
                  isActive && 'border-primary text-primary animate-pulse',
                  !isCompleted && !isActive && 'border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              {isActive && (
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium transition-colors duration-300',
                isCompleted && 'text-gray-700',
                isActive && 'text-primary',
                !isCompleted && !isActive && 'text-gray-400'
              )}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Premium spinner with multiple layers
export const PremiumSpinner: React.FC<LoaderProps> = ({ 
  className, 
  size = 'md',
  variant = 'default' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const variantClasses = {
    default: 'text-primary',
    primary: 'text-primary',
    secondary: 'text-secondary',
    gradient: 'text-transparent bg-gradient-to-r from-primary to-secondary'
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
      
      {/* Middle ring */}
      <div className="absolute inset-0 rounded-full border-4 border-t-primary/60 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      
      {/* Inner ring */}
      <div className="absolute inset-2 rounded-full border-2 border-b-primary border-t-transparent border-r-transparent border-l-transparent animate-spin-reverse" />
      
      {/* Center dot */}
      <div className="absolute inset-1/3 rounded-full bg-primary animate-pulse" />
    </div>
  );
};

// Loading dots animation
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </div>
  );
};

// Breathing effect loader
export const BreathingLoader: React.FC<LoaderProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-breathe" />
      <div className="absolute inset-2 rounded-full bg-primary/40 animate-breathe animation-delay-300" />
      <div className="absolute inset-4 rounded-full bg-primary/60 animate-breathe animation-delay-600" />
      <div className="absolute inset-6 rounded-full bg-primary animate-pulse" />
    </div>
  );
};

// Wave loader for smooth transitions
export const PulseWaveLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className="w-1 bg-primary rounded-full animate-wave"
          style={{
            height: '24px',
            animationDelay: `${index * 100}ms`
          }}
        />
      ))}
    </div>
  );
};

// Export all loaders
export const Loaders = {
  BarberShopLogo,
  ProgressBar,
  StageProgress,
  PremiumSpinner,
  LoadingDots,
  BreathingLoader,
  PulseWaveLoader
};