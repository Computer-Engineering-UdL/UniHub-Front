import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminUsersComponent } from './users/users.component';
import { AdminDashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: AdminDashboardComponent
  },
  {
    path: 'users',
    component: AdminUsersComponent
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, RouterModule.forChild(routes), NgOptimizedImage],
  declarations: [AdminUsersComponent, AdminDashboardComponent]
})
export class AdminModule {}
