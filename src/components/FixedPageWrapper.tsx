import React from 'react';

interface FixedPageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente wrapper para garantir que páginas fiquem fixas
 * e evitem scroll excessivo do layout inteiro
 */
export const FixedPageWrapper: React.FC<FixedPageWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`page-container ${className}`}>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default FixedPageWrapper;
