export interface User {
  id: string;
  email: string;
  userType: string;
  roleId: number;
  roleName: string;  // newly added
  isEmailVerified: number;
  lastLoginAt: string;
}
