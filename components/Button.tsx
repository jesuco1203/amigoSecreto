import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-christmas-red text-white hover:bg-christmas-darkRed ring-2 ring-christmas-red ring-offset-2 ring-offset-cream",
    secondary: "bg-christmas-green text-white hover:bg-green-800 ring-2 ring-christmas-green ring-offset-2 ring-offset-cream",
    outline: "bg-transparent border-2 border-gray-400 text-gray-700 hover:border-gray-600 hover:text-gray-900",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};