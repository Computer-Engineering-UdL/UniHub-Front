import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { termsGuard } from './guards/terms.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginModule),
    data: { public: true, guestOnly: true, topBar: false }
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then((m) => m.SignupModule),
    data: { public: true, guestOnly: true, topBar: false }
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./onboarding/onboarding.module').then((m) => m.OnboardingModule),
    canActivate: [AuthGuard],
    data: { topBar: true }
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then((m) => m.HomePageModule),
    canActivate: [termsGuard],
    data: { public: true, titleKey: 'TOPBAR.HOME' }
  },
  {
    path: 'rooms',
    loadChildren: () => import('./rooms/rooms.module').then((m) => m.RoomsModule),
    canActivate: [termsGuard],
    data: { public: true, titleKey: 'TOPBAR.ROOMS' }
  },
  {
    path: 'items',
    loadChildren: () => import('./uni-items/uni-items.module').then((m) => m.UniItemsModule),
    canActivate: [termsGuard],
    data: { public: true, titleKey: 'TOPBAR.UNIITEMS' }
  },
  {
    path: 'jobs',
    loadChildren: () => import('./unijobs/unijobs.module').then((m) => m.UniJobsModule),
    canActivate: [termsGuard],
    data: { public: true, titleKey: 'UNIJOBS.LIST.TITLE' }
  },
  {
    path: 'channels',
    loadChildren: () => import('./channels/channels.module').then((m) => m.ChannelsModule),
    canActivate: [termsGuard],
    data: { titleKey: 'TOPBAR.CHANNELS' }
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile-module').then((m) => m.ProfileModule),
    canActivate: [AuthGuard, termsGuard],
    data: { titleKey: 'TOPBAR.PROFILE' }
  },
  {
    path: 'messages',
    loadChildren: () => import('./messages/messages.module').then((m) => m.MessagesModule),
    canActivate: [AuthGuard, termsGuard],
    data: { titleKey: 'TOPBAR.MESSAGES' }
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
    canActivate: [AuthGuard, termsGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'unauthorized',
    loadChildren: () => import('./unauthorized/unauthorized.module').then((m) => m.UnauthorizedModule),
    data: { public: true, topBar: false }
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
