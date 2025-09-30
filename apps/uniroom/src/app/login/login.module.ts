import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LoginRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';

@NgModule({
  declarations: [LoginPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LoginRoutingModule
  ]
})
export class LoginModule { }
