import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'green' | 'blue' | 'red';
  showLabel?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'purple',
  showLabel = false,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  const colorClasses = {
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600'
  };
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Progresso</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'green' | 'blue' | 'red';
  showLabel?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'purple',
  showLabel = false,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  const colorClasses = {
    purple: 'text-purple-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  };
  
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <svg
        className={`transform -rotate-90 ${sizeClasses[size]}`}
        viewBox="0 0 44 44"
      >
        <circle
          cx="22"
          cy="22"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="22"
          cy="22"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${colorClasses[color]} transition-all duration-300 ease-out`}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-white font-medium">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};
