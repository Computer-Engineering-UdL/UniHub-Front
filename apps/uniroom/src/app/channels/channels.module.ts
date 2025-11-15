import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelsRoutingModule } from './channels-routing.module';
import { ChannelsPage } from './channels.page';
import { ChannelDetailPage } from './channel-detail/channel-detail.page';
import { CreateChannelModalComponent } from './create-channel-modal/create-channel-modal.component';
import { AddMemberModalComponent } from './channel-detail/add-member-modal/add-member-modal.component';
import { MemberActionsComponent } from './channel-detail/member-actions/member-actions.component';
import { BanMemberModalComponent } from './channel-detail/ban-member-modal/ban-member-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    ChannelsRoutingModule,
    CreateChannelModalComponent,
    AddMemberModalComponent,
    MemberActionsComponent,
    BanMemberModalComponent,
    NgOptimizedImage
  ],
  declarations: [ChannelsPage, ChannelDetailPage]
})
export class ChannelsModule {}
