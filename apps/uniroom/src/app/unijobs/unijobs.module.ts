import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { UniJobsRoutingModule } from './unijobs-routing.module';
import { JobsListPage } from './jobs-list/jobs-list.page';
import { JobDetailPage } from './job-detail/job-detail.page';
import { MyApplicationsPage } from './my-applications/my-applications.page';
import { ApplyJobDialogComponent } from './apply-job-dialog/apply-job-dialog.component';
import { SharedModule } from '../shared/shared-module';

@NgModule({
  declarations: [JobsListPage, JobDetailPage, MyApplicationsPage, ApplyJobDialogComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, TranslateModule, SharedModule, UniJobsRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UniJobsModule {}
