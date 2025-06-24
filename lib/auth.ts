import { ID, Models } from 'appwrite';
import { account, databases, appwriteConfig } from './appwrite';
import { 
  User, 
  AdminUser, 
  AuthUser, 
  LoginCredentials, 
  RegisterCredentials, 
  UserRole,
  ApiResponse 
} from './types';
import { 
  userRegistrationSchema, 
  loginSchema, 
  validateNigerianPhone 
} from './validations';

// Authentication service for Gab'z Laundromat
export class AuthService {
  
  // Customer Registration
  async registerCustomer(userData: RegisterCredentials): Promise<ApiResponse<AuthUser>> {
    try {
      // Validate input data
      const validationResult = userRegistrationSchema.safeParse({
        ...userData,
        addresses: [{
          street: '',
          area: '',
          lga: 'Lagos Island',
          state: 'Lagos State'
        }] // Temporary default, will be updated during onboarding
      });

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Validate Nigerian phone number
      if (!validateNigerianPhone(userData.phone)) {
        return {
          success: false,
          error: 'Invalid Nigerian phone number format. Use 0XXXXXXXXXX'
        };
      }

      // Create Appwrite account
      const appwriteUser = await account.create(
        ID.unique(),
        userData.email,
        userData.password,
        `${userData.firstName} ${userData.lastName}`
      );

      // Create user profile in database with Appwrite-compatible structure
      const userProfile = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isWhatsAppNumber: false,
        addresses: '[]', // Empty JSON array as string
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        registrationSource: 'web',
        role: 'customer'
      };

      // Save to Users collection
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        appwriteUser.$id,
        userProfile
      );

      // Send verification email (don't log them in automatically)
      // We'll let them log in manually after registration
      try {
        await account.createVerification(process.env.NEXT_PUBLIC_APP_URL + '/verify-email');
      } catch (verificationError) {
        console.warn('Could not send verification email:', verificationError);
        // Don't fail registration if verification email fails
      }

      return {
        success: true,
        data: {
          $id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          phone: userData.phone,
          emailVerification: appwriteUser.emailVerification,
          phoneVerification: appwriteUser.phoneVerification,
          prefs: appwriteUser.prefs
        },
        message: 'Registration successful. Please check your email for verification.'
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }
  }

  // Customer Login
  async loginCustomer(credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> {
    try {
      console.log('🔐 Starting customer login process...');
      
      // Validate credentials
      const validationResult = loginSchema.safeParse(credentials);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Check for existing sessions and delete them before login
      try {
        console.log('🔍 Checking for existing session...');
        // First try to get the current session
        await account.get();
        // If successful (no error thrown), we have an active session to delete
        console.log('📤 Found existing session, deleting it...');
        await account.deleteSession('current');
      } catch (sessionError) {
        console.log('ℹ️ No existing session found or error deleting session, continuing with login...');
        // No active session or error getting session, which is fine for login
      }

      // Now create a new session
      console.log('📥 Creating new customer session...');
      const session = await account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );
      console.log('✅ Customer session created successfully:', session.$id);

      // Get current user
      const user = await account.get();
      
      // Check if this user exists in the AdminUsers collection (meaning they are staff/owner)
      try {
        const adminUser = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.collections.adminUsers,
          [
            // Filter by user ID
            `$id=${user.$id}`
          ]
        );
        
        // If we found a record, this user is an admin/staff/owner
        if (adminUser.documents.length > 0) {
          // Delete the session we just created
          await account.deleteSession('current');
          
          return {
            success: false,
            error: 'Staff and owner accounts must use the staff login page'
          };
        }
      } catch (error) {
        // If there's an error checking admin status, we'll continue
        // This is safer than blocking a legitimate customer due to a DB error
        console.log('Error checking admin status:', error);
      }

      console.log("🎉 Customer login successful, returning user:", user.email);
      return {
        success: true,
        data: {
          $id: user.$id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
          prefs: user.prefs
        },
        message: 'Login successful'
      };
      
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }
  }

  // Admin Login
  async loginAdmin(credentials: LoginCredentials): Promise<ApiResponse<{user: AuthUser, role: UserRole}>> {
    try {
      console.log('🔐 Starting admin login process...');
      
      // Validate credentials
      const validationResult = loginSchema.safeParse(credentials);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Check for existing sessions and delete them before login
      try {
        console.log('🔍 Checking for existing session...');
        // First try to get the current session
        await account.get();
        // If successful (no error thrown), we have an active session to delete
        console.log('📤 Found existing session, deleting it...');
        await account.deleteSession('current');
      } catch (sessionError) {
        console.log('ℹ️ No existing session found or error deleting session, continuing with admin login...');
        // No active session or error getting session, which is fine for login
      }

      // Now create a new session
      console.log('📥 Creating new admin session...');
      await account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );
      console.log('✅ Admin session created successfully');

      // Get current user
      const user = await account.get();

      // Check if user is admin by looking up in AdminUsers collection
      try {
        const adminUser = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.adminUsers,
          user.$id
        ) as AdminUser;

        if (!adminUser.isActive) {
          await this.logout();
          return {
            success: false,
            error: 'Admin account is deactivated'
          };
        }

        // Update last login
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.adminUsers,
          user.$id,
          {
            lastLogin: new Date().toISOString()
          }
        );

        console.log("🎉 Admin login successful, returning user:", user.email, "role:", adminUser.role);
        return {
          success: true,
          data: {
            user: {
              $id: user.$id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              emailVerification: user.emailVerification,
              phoneVerification: user.phoneVerification,
              prefs: user.prefs
            },
            role: adminUser.role
          },
          message: 'Admin login successful'
        };
        
      } catch (adminError) {
        // User exists but is not an admin
        await this.logout();
        return {
          success: false,
          error: 'Access denied. Admin privileges required.'
        };
      }

    } catch (error: any) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }
  }

  // Get Current User
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const user = await account.get();
      return {
        success: true,
        data: {
          $id: user.$id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
          prefs: user.prefs
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'No active session found'
      };
    }
  }

  // Get User Profile (from database)
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    try {
      const rawProfile = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        userId
      );

      // Convert Appwrite format back to our User type
      let addresses = [];
      try {
        addresses = JSON.parse(rawProfile.addresses || '[]');
      } catch (e) {
        addresses = [];
      }

      const userProfile: User = {
        $id: rawProfile.$id,
        $collectionId: rawProfile.$collectionId,
        $databaseId: rawProfile.$databaseId,
        $createdAt: rawProfile.$createdAt,
        $updatedAt: rawProfile.$updatedAt,
        $permissions: rawProfile.$permissions,
        email: rawProfile.email,
        firstName: rawProfile.firstName,
        lastName: rawProfile.lastName,
        phone: {
          number: rawProfile.phone || '',
          isWhatsApp: rawProfile.isWhatsAppNumber || false
        },
        addresses: addresses,
        dateOfBirth: rawProfile.dateOfBirth,
        gender: rawProfile.gender,
        isActive: rawProfile.isActive,
        emailVerified: rawProfile.emailVerified,
        phoneVerified: rawProfile.phoneVerified,
        totalOrders: rawProfile.totalOrders || 0,
        totalSpent: rawProfile.totalSpent || 0,
        loyaltyPoints: rawProfile.loyaltyPoints || 0,
        preferredPaymentMethod: rawProfile.preferredPaymentMethod,
        notes: rawProfile.notes,
        registrationSource: rawProfile.registrationSource || 'web',
        referredBy: rawProfile.referredBy
      };

      return {
        success: true,
        data: userProfile
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }
  }

  // Get Admin Profile (from database)
  async getAdminProfile(userId: string): Promise<ApiResponse<AdminUser>> {
    try {
      const rawProfile = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        userId
      );

      // Convert Appwrite format back to our AdminUser type
      const adminProfile: AdminUser = {
        $id: rawProfile.$id,
        $collectionId: rawProfile.$collectionId,
        $databaseId: rawProfile.$databaseId,
        $createdAt: rawProfile.$createdAt,
        $updatedAt: rawProfile.$updatedAt,
        $permissions: rawProfile.$permissions,
        email: rawProfile.email,
        firstName: rawProfile.firstName,
        lastName: rawProfile.lastName,
        phone: {
          number: rawProfile.phoneNumber || '',
          isWhatsApp: rawProfile.isWhatsAppNumber || false
        },
        role: rawProfile.role,
        isActive: rawProfile.isActive,
        permissions: JSON.parse(rawProfile.permissions || '[]'),
        assignedAreas: JSON.parse(rawProfile.assignedAreas || '[]'),
        workingHours: {
          start: rawProfile.workingHoursStart || '09:00',
          end: rawProfile.workingHoursEnd || '17:00'
        },
        workingDays: JSON.parse(rawProfile.workingDays || '[]'),
        employeeId: rawProfile.employeeId,
        hireDate: rawProfile.hireDate,
        lastLogin: rawProfile.lastLogin,
        totalOrdersHandled: rawProfile.totalOrdersHandled || 0,
        averageRating: rawProfile.averageRating
      };

      return {
        success: true,
        data: adminProfile
      };
    } catch (error: any) {
      console.error('Failed to fetch admin profile:', error);
      return {
        success: false,
        error: 'Failed to fetch admin profile'
      };
    }
  }

  // Logout
  async logout(): Promise<ApiResponse<null>> {
    try {
      await account.deleteSession('current');
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  // Password Reset
  async resetPassword(email: string): Promise<ApiResponse<null>> {
    try {
      await account.createRecovery(
        email,
        'https://gab-dun.vercel.app/reset-password'
      );
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to send password reset email'
      };
    }
  }

  // Complete Password Reset
  async completePasswordReset(
    userId: string, 
    secret: string, 
    newPassword: string
  ): Promise<ApiResponse<null>> {
    try {
      await account.updateRecovery(userId, secret, newPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Email Verification
  async verifyEmail(userId: string, secret: string): Promise<ApiResponse<null>> {
    try {
      await account.updateVerification(userId, secret);
      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Email verification failed'
      };
    }
  }

  // Send Email Verification
  async sendEmailVerification(): Promise<ApiResponse<null>> {
    try {
      await account.createVerification(process.env.NEXT_PUBLIC_APP_URL + '/verify-email');
      return {
        success: true,
        message: 'Verification email sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
  }

  // Update Password
  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    try {
      await account.updatePassword(newPassword, currentPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      await account.get();
      return true;
    } catch {
      return false;
    }
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        userId
      );
      return true;
    } catch {
      return false;
    }
  }

  // Get all sessions
  async getSessions(): Promise<ApiResponse<Models.Session[]>> {
    try {
      const sessions = await account.listSessions();
      return {
        success: true,
        data: sessions.sessions
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch sessions'
      };
    }
  }

  // Delete specific session
  async deleteSession(sessionId: string): Promise<ApiResponse<null>> {
    try {
      await account.deleteSession(sessionId);
      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to delete session'
      };
    }
  }

  // Register Admin User (Staff Registration)
  async registerAdmin(adminData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRole;
    permissions: string[];
    assignedAreas: string[];
    workingHours: { start: string; end: string };
    workingDays: string[];
    employeeId: string;
    hireDate: string;
  }): Promise<ApiResponse<AdminUser>> {
    try {
      // Validate Nigerian phone number
      if (!validateNigerianPhone(adminData.phone)) {
        return {
          success: false,
          error: 'Invalid Nigerian phone number format. Use 0XXXXXXXXXX'
        };
      }

      // Create Appwrite account
      const appwriteUser = await account.create(
        ID.unique(),
        adminData.email,
        adminData.password,
        `${adminData.firstName} ${adminData.lastName}`
      );

      // Create admin user profile in database
      const adminUserData = {
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phone: {
          number: adminData.phone,
          isWhatsApp: false
        },
        role: adminData.role,
        isActive: true,
        permissions: adminData.permissions,
        assignedAreas: adminData.assignedAreas,
        workingHours: adminData.workingHours,
        workingDays: adminData.workingDays,
        employeeId: adminData.employeeId,
        hireDate: adminData.hireDate,
        totalOrdersHandled: 0,
        averageRating: 0
      };

      // Save to AdminUsers collection using the same ID as the auth user
      const appwriteData = {
        email: adminUserData.email,
        firstName: adminUserData.firstName,
        lastName: adminUserData.lastName,
        phoneNumber: adminUserData.phone.number,
        role: adminUserData.role,
        isActive: adminUserData.isActive,
        permissions: JSON.stringify(adminUserData.permissions),
        assignedAreas: JSON.stringify(adminUserData.assignedAreas),
        workingDays: JSON.stringify(adminUserData.workingDays),
        employeeId: adminUserData.employeeId,
        hireDate: adminUserData.hireDate,
        totalOrdersHandled: 0,
        averageRating: 0
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        appwriteUser.$id,
        appwriteData
      );

      // Send verification email
      await account.createVerification(process.env.NEXT_PUBLIC_APP_URL + '/verify-email');

      return {
        success: true,
        data: {
          $id: appwriteUser.$id,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          $collectionId: appwriteConfig.collections.adminUsers,
          $databaseId: appwriteConfig.databaseId,
          ...adminUserData
        } as AdminUser,
        message: 'Staff member registered successfully. They can now login at /admin/login'
      };

    } catch (error: any) {
      console.error('Admin registration error:', error);
      return {
        success: false,
        error: error.message || 'Staff registration failed. Please try again.'
      };
    }
  }
}

// Create and export instance
export const authService = new AuthService();