'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { PasswordInput } from '@/components/ui/password-input';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginAdmin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginAdmin(email, password);
      
      if (result.success) {
        // Check if user is owner (highest level admin)
        router.push('/owner/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-24 h-24 md:w-32 md:h-32 bg-blue-200/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-16 h-16 md:w-20 md:h-20 bg-indigo-200/20 rounded-full animate-float animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 md:w-16 md:h-16 bg-purple-200/20 rounded-full animate-float animation-delay-4000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className={`text-center ${ac.fadeIn}`}>
          {/* Logo/Icon */}
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <span className="text-2xl md:text-3xl text-white">👑</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Owner Portal
          </h2>
          <p className="text-base md:text-lg text-gray-600 font-medium">
            Sign in to access the business dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className={`bg-white/80 backdrop-blur-md py-8 px-6 md:px-10 shadow-2xl rounded-2xl md:rounded-3xl border border-white/50 ${ac.slideIn}`} style={{ animationDelay: '0.2s' }}>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className={`${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Owner Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">👑</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/80"
                  placeholder="Enter your owner email"
                />
              </div>
            </div>

            <div className={`${ac.fadeIn}`} style={{ animationDelay: '0.4s' }}>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label="Password"
                placeholder="Enter your password"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/80"
              />
            </div>

            <div className={`${ac.fadeIn}`} style={{ animationDelay: '0.5s' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span className="mr-2">👑</span>
                    Sign in as Owner
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className={`text-center ${ac.fadeIn}`} style={{ animationDelay: '0.6s' }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 text-gray-500 font-medium">or</span>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/admin/login"
                  className="group inline-flex items-center font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  <span className="mr-2">👨‍💼</span>
                  Staff login instead
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 