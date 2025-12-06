import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfilePage } from './profile/profile.page';
import { PublicProfilePage } from './public-profile/public-profile.page';

const routes: Routes = [
  {
    path: '',
    component: ProfilePage
  },
  {
    path: ':userId',
    component: PublicProfilePage,
    data: { public: true, titleKey: 'PROFILE.PUBLIC.TITLE' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule {}
