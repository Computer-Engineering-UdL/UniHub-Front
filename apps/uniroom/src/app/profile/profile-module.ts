import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileRoutingModule } from './profile-routing-module';
import { ProfilePage } from './profile/profile.page';

@NgModule({
  declarations: [ProfilePage],
  imports: [CommonModule, IonicModule, TranslateModule, ProfileRoutingModule, NgOptimizedImage]
})
export class ProfileModule {}
