import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChannelsPage } from './channels.page';
import { ChannelDetailPage } from './channel-detail/channel-detail.page';

const routes: Routes = [
  {
    path: '',
    component: ChannelsPage
  },
  {
    path: ':id',
    component: ChannelDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChannelsRoutingModule {}
