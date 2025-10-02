import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { UnauthorizedRoutingModule } from './unauthorized-routing.module';
import { UnauthorizedPage } from './unauthorized.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    UnauthorizedRoutingModule,
  ],
  declarations: [UnauthorizedPage],
})
export class UnauthorizedModule {}
