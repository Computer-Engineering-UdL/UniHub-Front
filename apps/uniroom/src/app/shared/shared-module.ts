import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { NotificationToastComponent } from './notification-toast/notification-toast.component';
import { NotificationContainerComponent } from './notification-container/notification-container.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [SidebarComponent, TopBarComponent, NotificationToastComponent, NotificationContainerComponent],
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, NgOptimizedImage],
  exports: [SidebarComponent, TopBarComponent, NotificationToastComponent, NotificationContainerComponent]
})
export class SharedModule {}
