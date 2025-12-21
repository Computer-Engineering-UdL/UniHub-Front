import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminUsersComponent } from './users/users.component';
import { AdminDashboardComponent } from './dashboard/dashboard.component';
import { AdminReportsComponent } from './reports/reports.component';
import { AdminTermsComponent } from './terms/admin-terms.component';
import { SharedModule } from '../shared/shared-module';

const routes: Routes = [
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    data: { titleKey: 'SIDEBAR.ADMIN_DASHBOARD' }
  },
  {
    path: 'users',
    component: AdminUsersComponent,
    data: { titleKey: 'ADMIN.USERS.TITLE' }
  },
  {
    path: 'reports',
    component: AdminReportsComponent,
    data: { titleKey: 'ADMIN.REPORTS.TITLE' }
  },
  {
    path: 'terms',
    component: AdminTermsComponent,
    data: { titleKey: 'ADMIN.TERMS.TITLE' }
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    RouterModule.forChild(routes),
    NgOptimizedImage,
    SharedModule,
    AdminTermsComponent
  ],
  declarations: [AdminUsersComponent, AdminDashboardComponent, AdminReportsComponent]
})
export class AdminModule {}
