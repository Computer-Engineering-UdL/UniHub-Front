import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginModule),
    data: { public: true, guestOnly: true }
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then((m) => m.SignupModule),
    data: { public: true, guestOnly: true }
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then((m) => m.HomePageModule),
    data: { public: true }
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile-module').then((m) => m.ProfileModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'unauthorized',
    loadChildren: () => import('./unauthorized/unauthorized.module').then((m) => m.UnauthorizedModule),
    data: { public: true }
  },
  {
    path: '**',
    redirectTo: 'unauthorized',
    pathMatch: 'full'
  }
];

// DEAR PROGRAMMER:
// To add a new route, consider if the route should be public and its roles. Here there is an example:
/*
{
  path: 'seller-example',
    loadChildren: () => import('./seller/seller.module').then((m) => m.SellerPageModule),
  canActivate: [AuthGuard],
  data: { roles: ['Seller', "Admin"] }
},
 */

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
