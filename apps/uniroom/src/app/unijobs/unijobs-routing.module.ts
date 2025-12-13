import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';
import { JobsListPage } from './jobs-list/jobs-list.page';
import { MyApplicationsPage } from './my-applications/my-applications.page';
import { JobDetailPage } from './job-detail/job-detail.page';

const routes: Routes = [
  {
    path: '',
    component: JobsListPage,
    data: { public: true, titleKey: 'UNIJOBS.LIST.TITLE' }
  },
  {
    path: 'applications',
    component: MyApplicationsPage,
    canActivate: [AuthGuard],
    data: { titleKey: 'UNIJOBS.APPLICATIONS.TITLE' }
  },
  {
    path: ':id',
    component: JobDetailPage,
    data: { public: true, titleKey: 'UNIJOBS.DETAIL.TITLE' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UniJobsRoutingModule {}
