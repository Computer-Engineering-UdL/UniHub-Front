import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RouteAccessData, Role, User } from '../models/auth.types';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  // Access logic via route data: { public, guestOnly }
  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): boolean | UrlTree {
    const data: RouteAccessData = (route.data || {}) as RouteAccessData;
    const isAuth: boolean = this.authService.isAuthenticated();
    const { public: isPublic, guestOnly, roles } = data;

    if (isPublic) {
      if (guestOnly && isAuth) return this.router.parseUrl('/home');
      return true;
    }
    if (!isAuth) {
      return this.router.parseUrl('/login');
    }

    // Role-based access
    if (roles && roles.length > 0) {
      const user: User | null = this.authService.currentUser;
      const userRole: Role = user?.role ?? 'Basic';
      if (!roles.includes(userRole)) {
        return this.router.parseUrl('/unauthorized');
      }
    }
    return true;
  }
}
