'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../auth';
import { AuthUser, User, AdminUser, UserRole, ApiResponse } from '../types';

// Authentication context type
interface AuthContextType {
  // Current authentication state
  user: AuthUser | null;
  userProfile: User | AdminUser | null;
  userRole: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<ApiResponse<AuthUser>>;
  loginAdmin: (email: string, password: string) => Promise<ApiResponse<{user: AuthUser, role: UserRole}>>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => Promise<ApiResponse<AuthUser>>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Password management
  resetPassword: (email: string) => Promise<ApiResponse<null>>;
  completePasswordReset: (userId: string, secret: string, newPassword: string) => Promise<ApiResponse<null>>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<ApiResponse<null>>;
  
  // Email verification
  verifyEmail: (userId: string, secret: string) => Promise<ApiResponse<null>>;
  sendEmailVerification: () => Promise<ApiResponse<null>>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | AdminUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed values
  const isAuthenticated = !!user;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.OWNER || userRole === UserRole.STAFF;

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is already authenticated
      const userResponse = await authService.getCurrentUser();
      
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        
        // Try to get admin profile first
        const adminResponse = await authService.getAdminProfile(userResponse.data.$id);
        if (adminResponse.success && adminResponse.data) {
          setUserProfile(adminResponse.data);
          setUserRole(adminResponse.data.role);
        } else {
          // Get customer profile
          const customerResponse = await authService.getUserProfile(userResponse.data.$id);
          if (customerResponse.success && customerResponse.data) {
            setUserProfile(customerResponse.data);
            setUserRole(UserRole.CUSTOMER);
          } else {
            // User exists in auth but has no profile, log them out.
            console.warn('User authenticated but no profile found. Logging out.');
            await logout();
          }
        }
      } else {
        // No session, clear user state
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear state on error
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Customer login
  const login = async (email: string, password: string): Promise<ApiResponse<AuthUser>> => {
    try {
      setIsLoading(true);
      
      const response = await authService.loginCustomer({ email, password });
      
      if (response.success && response.data) {
        setUser(response.data);
        setUserRole(UserRole.CUSTOMER);
        
        // Get customer profile
        const profileResponse = await authService.getUserProfile(response.data.$id);
        if (profileResponse.success && profileResponse.data) {
          setUserProfile(profileResponse.data);
        }
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Admin login
  const loginAdmin = async (email: string, password: string): Promise<ApiResponse<{user: AuthUser, role: UserRole}>> => {
    try {
      setIsLoading(true);
      
      const response = await authService.loginAdmin({ email, password });
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setUserRole(response.data.role);
        
        // Get admin profile
        const profileResponse = await authService.getAdminProfile(response.data.user.$id);
        if (profileResponse.success && profileResponse.data) {
          setUserProfile(profileResponse.data);
        }
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Admin login failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Register new customer
  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<ApiResponse<AuthUser>> => {
    try {
      setIsLoading(true);
      
      const response = await authService.registerCustomer(userData);
      
      // Don't automatically log them in after registration
      // Let them go to login page and sign in manually
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    // Immediately clear state for a faster UI response
    setUser(null);
    setUserProfile(null);
    setUserRole(null);
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // If logout fails, the state is already cleared, which is often the desired behavior.
      // You could add logic here to try and re-authenticate if needed.
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        
        // Refresh profile based on current role
        if (isAdmin && user) {
          const adminResponse = await authService.getAdminProfile(user.$id);
          if (adminResponse.success && adminResponse.data) {
            setUserProfile(adminResponse.data);
          }
        } else if (user) {
          const customerResponse = await authService.getUserProfile(user.$id);
          if (customerResponse.success && customerResponse.data) {
            setUserProfile(customerResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  // Password reset
  const resetPassword = async (email: string): Promise<ApiResponse<null>> => {
    return await authService.resetPassword(email);
  };

  // Complete password reset
  const completePasswordReset = async (
    userId: string,
    secret: string,
    newPassword: string
  ): Promise<ApiResponse<null>> => {
    return await authService.completePasswordReset(userId, secret, newPassword);
  };

  // Update password
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse<null>> => {
    return await authService.updatePassword(currentPassword, newPassword);
  };

  // Verify email
  const verifyEmail = async (userId: string, secret: string): Promise<ApiResponse<null>> => {
    const response = await authService.verifyEmail(userId, secret);
    if (response.success) {
      // Refresh user data to update verification status
      await refreshUser();
    }
    return response;
  };

  // Send email verification
  const sendEmailVerification = async (): Promise<ApiResponse<null>> => {
    return await authService.sendEmailVerification();
  };

  // While the authentication state is initializing, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative flex justify-center items-center mb-4">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute w-16 h-16 border-4 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
            <span className="absolute text-2xl">🧺</span>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
          <p className="text-sm text-gray-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  // Value for the context provider
  const value: AuthContextType = {
    user,
    userProfile,
    userRole,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    loginAdmin,
    register,
    logout,
    refreshUser,
    resetPassword,
    completePasswordReset,
    updatePassword,
    verifyEmail,
    sendEmailVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login or handle unauthenticated state
      console.warn('Authentication required');
    }
  }, [auth.isLoading, auth.isAuthenticated]);
  
  return auth;
}

// Hook to require admin authentication
export function useRequireAdmin() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && (!auth.isAuthenticated || !auth.isAdmin)) {
      // Redirect to login or handle unauthorized state
      console.warn('Admin authentication required');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isAdmin]);
  
  return auth;
}

// Component to protect routes
export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  fallback = <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
}: { 
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}) {
  const auth = useAuth();

  if (auth.isLoading) {
    return <>{fallback}</>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (requireAdmin && !auth.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// HOC for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requireAdmin: boolean = false
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requireAdmin={requireAdmin}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}