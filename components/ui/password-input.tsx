'use client';

import { useState } from 'react';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  required = true,
  className = '',
  label,
  helperText
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          className={`appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10 ${className}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      {helperText && (
        <p className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
} 