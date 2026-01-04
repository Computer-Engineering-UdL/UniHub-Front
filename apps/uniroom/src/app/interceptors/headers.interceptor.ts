import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

export const headersInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  if (!req.headers.has('Content-Type') && req.method !== 'GET' && req.method !== 'DELETE') {
    req = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  if (!req.headers.has('Accept')) {
    req = req.clone({
      setHeaders: {
        Accept: 'application/json'
      }
    });
  }

  return next(req);
};
