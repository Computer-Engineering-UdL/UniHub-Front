import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Role, User } from '../models/auth.types';

interface MockAuthService {
  isAuthenticated: jasmine.Spy;
  _user: User | null;
  readonly currentUser: User | null;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceMock: MockAuthService;
  let routerMock: { parseUrl: jasmine.Spy };

  const createRoute = (data: Record<string, unknown>): ActivatedRouteSnapshot => ({ data }) as ActivatedRouteSnapshot;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      _user: null,
      get currentUser() {
        return this._user;
      }
    };

    routerMock = {
      parseUrl: jasmine.createSpy('parseUrl').and.callFake((url: string): UrlTree => ({ url }) as unknown as UrlTree)
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('permite acceso a ruta pública sin autenticación', async () => {
    const route = createRoute({ public: true });
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('redirige a /home si ruta guestOnly y usuario autenticado', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const route = createRoute({ public: true, guestOnly: true });
    const result = (await guard.canActivate(route, {} as RouterStateSnapshot)) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/home');
    expect((result as UrlTree & { url: string }).url).toBe('/home');
  });

  it('permite acceso a ruta guestOnly si NO autenticado', async () => {
    authServiceMock.isAuthenticated.and.returnValue(false);
    const route = createRoute({ public: true, guestOnly: true });
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('permite acceso a ruta protegida si autenticado', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const route = createRoute({});
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('redirige a /login si ruta protegida y NO autenticado', async () => {
    authServiceMock.isAuthenticated.and.returnValue(false);
    const route = createRoute({});
    const result = (await guard.canActivate(route, {} as RouterStateSnapshot)) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
    expect((result as UrlTree & { url: string }).url).toBe('/login');
  });

  it("permite acceso quan l'usuari té un dels rols requerits", async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Admin' as Role
    };
    const route = createRoute({ roles: ['Seller', 'Admin'] });
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it("redirigeix quan l'usuari no té el rol requerit", async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Basic' as Role
    } as User;
    const route = createRoute({ roles: ['Admin'] });
    const result = (await guard.canActivate(route, {} as RouterStateSnapshot)) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/unauthorized');
    expect((result as UrlTree & { url: string }).url).toBe('/unauthorized');
  });

  it('should allow access when user has one of multiple required roles', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Seller' as Role
    };
    const route = createRoute({ roles: ['Seller', 'Admin'] });
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('should redirect to unauthorized when no roles match', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Basic' as Role
    };
    const route = createRoute({ roles: ['Admin', 'Seller'] });
    const result = (await guard.canActivate(route, {} as RouterStateSnapshot)) as UrlTree | boolean;
    expect(result).not.toBeTrue();
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/unauthorized');
  });

  it('should allow access to route without role restrictions', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Basic' as Role
    };
    const route = createRoute({});
    const result = await guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('should handle null user when authenticated', async () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = null;
    const route = createRoute({ roles: ['Admin'] });
    const result = (await guard.canActivate(route, {} as RouterStateSnapshot)) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/unauthorized');
    expect((result as UrlTree & { url: string }).url).toBe('/unauthorized');
  });
});
