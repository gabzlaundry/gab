'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  variant?: 'default' | 'admin' | 'owner';
  showLogo?: boolean;
  showAuth?: boolean;
}

export function Navbar({ 
  variant = 'default',
  showLogo = true,
  showAuth = true 
}: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const getNavLinks = (): NavLink[] => {
    switch (variant) {
      case 'admin':
        return [
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/orders', label: 'Orders' },
          { href: '/admin/customers', label: 'Customers' },
          { href: '/admin/services', label: 'Services' }
        ];
      case 'owner':
        return [
          { href: '/owner/dashboard', label: 'Dashboard' },
          { href: '/admin/dashboard', label: 'Staff Dashboard' },
          { href: '/owner/reports', label: 'Reports' },
          { href: '/owner/settings', label: 'Settings' }
        ];
      default:
        const defaultLinks: NavLink[] = [
          { href: '/services', label: 'Services' },
          { href: '/book', label: 'Book Now' }
        ];

        if (isAuthenticated) {
          defaultLinks.push(
            { href: '/dashboard', label: 'Dashboard' },
          );
        }

        return defaultLinks;
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className={`${rc.header} border-b border-gray-200 relative z-50`}>
      <div className={rc.container}>
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            {showLogo && (
              <>
                <Link href="/" className={`text-2xl font-bold text-blue-600 ${ac.fadeIn}`}>
                  Gab'z Laundromat
                </Link>
                <span className={`text-sm text-gray-500 hidden sm:block ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
                  {variant === 'admin' ? 'Admin Dashboard' : 
                   variant === 'owner' ? 'Owner Dashboard' : 
                   'Lagos Premier Laundry Service'}
                </span>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>

          {/* Desktop Navigation */}
          <div className={`hidden lg:flex items-center space-x-6 ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
            {/* Nav Links */}
            <div className="flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            {showAuth && (
              <div className="flex items-center space-x-4 border-l pl-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <button 
                        type="button"
                        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                      >
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="hidden sm:block">{user?.name}</span>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link
                      href="/login"
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div 
          className={`fixed lg:hidden inset-x-0 top-16 bg-white shadow-lg transition-all duration-300 transform ${
            isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="px-4 py-3 space-y-3">
            {/* Mobile Nav Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block w-full text-gray-600 hover:text-gray-900 font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Auth Section */}
            {showAuth && (
              <div className="border-t pt-3 mt-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-700">{user?.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full text-left text-red-600 hover:text-red-700 font-medium py-2"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block w-full text-blue-600 hover:text-blue-700 font-medium text-center py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors mt-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}