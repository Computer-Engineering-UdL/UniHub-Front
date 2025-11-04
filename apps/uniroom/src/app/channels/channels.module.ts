import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelsRoutingModule } from './channels-routing.module';
import { ChannelsPage } from './channels.page';
import { ChannelDetailPage } from './channel-detail/channel-detail.page';
import { CreateChannelModalComponent } from './create-channel-modal/create-channel-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    ChannelsRoutingModule,
    CreateChannelModalComponent
  ],
  declarations: [ChannelsPage, ChannelDetailPage]
})
export class ChannelsModule {}
