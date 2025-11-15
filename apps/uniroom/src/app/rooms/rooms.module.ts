import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { RoomsComponent } from './rooms.component';
import { CreateOfferModalComponent } from './create-offer-modal/create-offer-modal.component';
import { RoomDetailsComponent } from './room-details/room-details.component';

const routes: Routes = [
  {
    path: '',
    component: RoomsComponent
  },
  {
    path: 'details/:id',
    component: RoomDetailsComponent,
    data: { titleKey: 'ROOM.DETAILS.PAGE_TITLE' }
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    RouterModule.forChild(routes),
    NgOptimizedImage
  ],
  declarations: [RoomsComponent, CreateOfferModalComponent, RoomDetailsComponent]
})
export class RoomsModule {}
