import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../shared/shared-module';
import { UniJobsRoutingModule } from './unijobs-routing.module';
import { JobsListPage } from './jobs-list/jobs-list.page';
import { JobDetailPage } from './job-detail/job-detail.page';
import { MyApplicationsPage } from './my-applications/my-applications.page';
import { ApplyJobDialogComponent } from './apply-job-dialog/apply-job-dialog.component';
import { CreateJobPage } from './create-job/create-job.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    SharedModule,
    UniJobsRoutingModule,
    JobsListPage,
    JobDetailPage,
    MyApplicationsPage,
    ApplyJobDialogComponent,
    CreateJobPage
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UniJobsModule {}
