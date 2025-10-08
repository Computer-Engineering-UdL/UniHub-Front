import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Role } from '../models/auth.types';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceMock: {
    isAuthenticated: jasmine.Spy;
    _user: any;
    readonly currentUser: any;
  };
  let routerMock: { parseUrl: jasmine.Spy };

  const createRoute = (data: any): ActivatedRouteSnapshot => ({ data }) as ActivatedRouteSnapshot;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      _user: null,
      get currentUser() {
        return this._user;
      }
    } as any;

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

  it('permite acceso a ruta pública sin autenticación', () => {
    const route = createRoute({ public: true });
    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('redirige a /home si ruta guestOnly y usuario autenticado', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const route = createRoute({ public: true, guestOnly: true });
    const result = guard.canActivate(route, {} as RouterStateSnapshot) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/home');
    expect((result as any).url).toBe('/home');
  });

  it('permite acceso a ruta guestOnly si NO autenticado', () => {
    authServiceMock.isAuthenticated.and.returnValue(false);
    const route = createRoute({ public: true, guestOnly: true });
    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('permite acceso a ruta protegida si autenticado', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const route = createRoute({});
    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
  });

  it('redirige a /login si ruta protegida y NO autenticado', () => {
    authServiceMock.isAuthenticated.and.returnValue(false);
    const route = createRoute({});
    const result = guard.canActivate(route, {} as RouterStateSnapshot) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
    expect((result as any).url).toBe('/login');
  });

  it("permite acceso quan l'usuari té un dels rols requerits", () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Admin' as Role
    };
    const route = createRoute({ roles: ['Seller', 'Admin'] });
    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBeTrue();
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it("redirigeix quan l'usuari no té el rol requerit", () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock._user = {
      id: '1',
      email: 'a@b.com',
      role: 'Basic' as Role
    };
    const route = createRoute({ roles: ['Admin'] });
    const result = guard.canActivate(route, {} as RouterStateSnapshot) as UrlTree | boolean;
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/unauthorized');
    expect((result as any).url).toBe('/unauthorized');
  });
});
