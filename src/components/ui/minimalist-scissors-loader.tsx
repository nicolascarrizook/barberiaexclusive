import React from 'react';
import { cn } from '@/lib/utils';

interface MinimalistScissorsLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MinimalistScissorsLoader: React.FC<MinimalistScissorsLoaderProps> = ({ 
  className, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  return (
    <div className={cn('relative flex items-center justify-center', sizeClasses[size], className)}>
      {/* Scissors SVG that morphs */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-scissors-morph"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top blade */}
        <path
          d="M50 20 L35 50 L50 50 Z"
          className="fill-gray-800 dark:fill-gray-200"
          style={{
            transformOrigin: '50px 50px',
            animation: 'scissors-top-blade 4s ease-in-out infinite'
          }}
        />
        
        {/* Bottom blade */}
        <path
          d="M50 80 L65 50 L50 50 Z"
          className="fill-gray-700 dark:fill-gray-300"
          style={{
            transformOrigin: '50px 50px',
            animation: 'scissors-bottom-blade 4s ease-in-out infinite'
          }}
        />
        
        {/* Center pivot */}
        <circle
          cx="50"
          cy="50"
          r="4"
          className="fill-gray-900 dark:fill-gray-100"
          style={{
            animation: 'scissors-pivot 4s ease-in-out infinite'
          }}
        />
        
        {/* Handle rings */}
        <circle
          cx="35"
          cy="75"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-700 dark:text-gray-300 fill-transparent"
          style={{
            animation: 'scissors-handle-left 4s ease-in-out infinite'
          }}
        />
        
        <circle
          cx="65"
          cy="75"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-700 dark:text-gray-300 fill-transparent"
          style={{
            animation: 'scissors-handle-right 4s ease-in-out infinite'
          }}
        />
      </svg>
      
      {/* Subtle breathing glow effect */}
      <div 
        className="absolute inset-0 rounded-full bg-gray-400/20 dark:bg-gray-600/20 blur-xl animate-breathe-slow"
        style={{ transform: 'scale(0.8)' }}
      />
    </div>
  );
};

// Simple loading wrapper
interface SimpleAuthLoaderProps {
  className?: string;
}

export const SimpleAuthLoader: React.FC<SimpleAuthLoaderProps> = ({ className }) => {
  return (
    <div className={cn(
      'fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300',
      className
    )}>
      <MinimalistScissorsLoader size="lg" />
    </div>
  );
};

// Inline version for smaller spaces
export const InlineScissorsLoader: React.FC<MinimalistScissorsLoaderProps> = ({ 
  className, 
  size = 'sm' 
}) => {
  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <MinimalistScissorsLoader size={size} />
    </div>
  );
};