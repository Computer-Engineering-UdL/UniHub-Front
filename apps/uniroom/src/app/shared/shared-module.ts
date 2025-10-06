import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [SidebarComponent],
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule],
  exports: [SidebarComponent]
})
export class SharedModule {}
