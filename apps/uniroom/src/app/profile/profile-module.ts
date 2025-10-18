import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileRoutingModule } from './profile-routing-module';
import { ProfilePage } from './profile/profile.page';
import { FormsModule } from '@angular/forms';
import { ProfileEditModal } from './profile-edit.modal';

@NgModule({
  declarations: [ProfilePage],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    ProfileRoutingModule,
    NgOptimizedImage,
    FormsModule,
    ProfileEditModal
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfileModule {}
