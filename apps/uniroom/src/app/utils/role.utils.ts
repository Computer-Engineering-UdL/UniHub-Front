import { Role } from '../models/auth.types';

export class RoleUtils {
  static hasRole(userRole: Role, allowedRoles: Role[]): boolean {
    return allowedRoles.includes(userRole);
  }

  static isBasic(role: Role): boolean {
    return role === 'Basic';
  }

  static isSeller(role: Role): boolean {
    return role === 'Seller';
  }

  static isAdmin(role: Role): boolean {
    return role === 'Admin';
  }

  static canManageItems(role: Role): boolean {
    return this.isSeller(role) || this.isAdmin(role);
  }

  static canAccessAdmin(role: Role): boolean {
    return this.isAdmin(role);
  }

  static getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
      Basic: 'Basic User',
      Seller: 'Seller',
      Admin: 'Administrator'
    };
    return labels[role];
  }

  static getRolePriority(role: Role): number {
    const priorities: Record<Role, number> = {
      Basic: 1,
      Seller: 2,
      Admin: 3
    };
    return priorities[role];
  }

  static hasHigherOrEqualPriority(userRole: Role, requiredRole: Role): boolean {
    return this.getRolePriority(userRole) >= this.getRolePriority(requiredRole);
  }
}
