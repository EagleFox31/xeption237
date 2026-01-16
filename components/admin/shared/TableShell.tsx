
import React from 'react';

interface TableShellProps {
  children: React.ReactNode;
  className?: string;
}

const TableShell: React.FC<TableShellProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl overflow-x-auto ${className}`}>
        {children}
    </div>
  );
};

export default TableShell;
