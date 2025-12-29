import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { LoginRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';
import { ForgotPasswordModalComponent } from './forgot-password-modal/forgot-password-modal.component';
import { ResetPasswordPage } from './reset-password/reset-password.page';

@NgModule({
  declarations: [LoginPage, ForgotPasswordModalComponent, ResetPasswordPage],
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, LoginRoutingModule, NgOptimizedImage]
})
export class LoginModule {}
