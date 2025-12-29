import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { NotificationToastComponent } from './notification-toast/notification-toast.component';
import { NotificationContainerComponent } from './notification-container/notification-container.component';
import { ReportModalComponent } from './reports/report-modal.component';
import { LocationPickerComponent } from './location-picker/location-picker.component';
import { ChangePasswordModalComponent } from './change-password-modal/change-password-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { CachedAvatarDirective } from './directives/cached-avatar.directive';
import { InterestTranslatePipe } from './pipes/interest-translate.pipe';
import { UniversityTranslatePipe } from './pipes/university-translate.pipe';

@NgModule({
  declarations: [
    SidebarComponent,
    TopBarComponent,
    NotificationToastComponent,
    NotificationContainerComponent,
    ReportModalComponent,
    LocationPickerComponent,
    ChangePasswordModalComponent,
    CachedAvatarDirective,
    InterestTranslatePipe,
    UniversityTranslatePipe
  ],
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, TranslateModule, NgOptimizedImage],
  exports: [
    SidebarComponent,
    TopBarComponent,
    NotificationToastComponent,
    NotificationContainerComponent,
    ReportModalComponent,
    LocationPickerComponent,
    ChangePasswordModalComponent,
    CachedAvatarDirective,
    InterestTranslatePipe,
    UniversityTranslatePipe
  ]
})
export class SharedModule {}
