import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, Observable, throwError, switchMap, BehaviorSubject, filter, take, Subscriber, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService: AuthService = inject(AuthService);

  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh') || req.url.includes('/auth/signup')) {
    return next(req);
  }

  return from(authService.getToken()).pipe(
    switchMap((token: string | null) => {
      let authReq = req;
      if (token) {
        authReq = addTokenToRequest(req, token);
      }

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            return from(authService.getRefreshToken()).pipe(
              switchMap((refreshToken: string | null) => {
                if (refreshToken) {
                  return handle401Error(authReq, next, authService);
                }
                return throwError(() => error);
              })
            );
          }
          return throwError(() => error);
        })
      );
    })
  );
};

function addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return new Observable<HttpEvent<any>>((observer: Subscriber<HttpEvent<any>>): void => {
      authService.refreshToken().then(
        async (): Promise<void> => {
          isRefreshing = false;
          const newToken: string | null = await authService.getToken();
          refreshTokenSubject.next(newToken);

          if (newToken) {
            next(addTokenToRequest(request, newToken)).subscribe({
              next: (event) => observer.next(event),
              error: (err) => observer.error(err),
              complete: () => observer.complete()
            });
          } else {
            observer.error(new Error('No token available'));
          }
        },
        async (error): Promise<void> => {
          isRefreshing = false;
          await authService.logout();
          observer.error(error);
        }
      );
    });
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        if (token) {
          return next(addTokenToRequest(request, token));
        }
        return throwError(() => new Error('No token available'));
      })
    );
  }
}
