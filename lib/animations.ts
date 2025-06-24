// Animation variants for Framer Motion
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const slideIn = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
  transition: { duration: 0.3 }
};

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: 0.3 }
};

// Tailwind CSS animation classes
export const animationClasses = {
  fadeIn: 'animate-fadeIn',
  slideIn: 'animate-slideIn',
  scaleIn: 'animate-scaleIn',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin'
};

// Responsive layout classes
export const responsiveClasses = {
  card: 'bg-white rounded-lg shadow-sm p-4 sm:p-6 transition-all duration-300 hover:shadow-md',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6',
  flexBetween: 'flex flex-col sm:flex-row justify-between items-center',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  sidebar: 'fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out',
  main: 'flex-1 min-h-screen transition-all duration-300',
  header: 'sticky top-0 z-20 bg-white shadow-sm transition-all duration-300'
}; 