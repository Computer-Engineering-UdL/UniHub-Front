import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { VerifyEmailRoutingModule } from './verify-email-routing.module';
import { VerifyEmailPage } from './verify-email.page';

@NgModule({
  imports: [CommonModule, IonicModule, TranslateModule, VerifyEmailRoutingModule],
  declarations: [VerifyEmailPage]
})
export class VerifyEmailModule {}
