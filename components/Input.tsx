import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>}
      <div className="relative">
        <input 
          className={`w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-christmas-green focus:border-transparent bg-white shadow-sm transition-all placeholder:text-gray-400 ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};