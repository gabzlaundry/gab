'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

export function BackButton({ 
  href, 
  label = 'Back', 
  className = '',
  variant = 'default',
  size = 'md'
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
    minimal: 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800',
    outlined: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400'
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-200 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        scale: 1.02,
        x: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      <motion.div
        whileHover={{ x: -3 }}
        transition={{ duration: 0.2 }}
      >
        <ArrowLeft size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
      </motion.div>
      {label}
    </motion.button>
  );
}

// Floating back button variant
export function FloatingBackButton({ 
  href, 
  className = '',
  position = 'top-left'
}: BackButtonProps & { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`
        fixed z-50 w-12 h-12 bg-white/90 backdrop-blur-md hover:bg-white
        border border-gray-200 rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center text-gray-700 hover:text-gray-900
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
        ${positionClasses[position]} ${className}
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.1,
        rotate: -5,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      <motion.div
        whileHover={{ x: -2 }}
        transition={{ duration: 0.2 }}
      >
        <ArrowLeft size={20} />
      </motion.div>
    </motion.button>
  );
} 