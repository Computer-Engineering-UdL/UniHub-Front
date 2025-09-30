import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { SignupRoutingModule } from './signup-routing.module';
import { SignupPage } from './signup.page';

@NgModule({
  declarations: [SignupPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SignupRoutingModule
  ]
})
export class SignupModule { }
