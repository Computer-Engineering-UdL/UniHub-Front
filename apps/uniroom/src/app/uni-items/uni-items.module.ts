import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { UniItemsRoutingModule } from './uni-items-routing.module';
import { ItemsListPage } from './items-list/items-list.page';
import { ItemDetailPage } from './item-detail/item-detail.page';
import { ItemEditPage } from './item-edit/item-edit.page';
import { SharedModule } from '../shared/shared-module';

@NgModule({
  declarations: [ItemsListPage, ItemDetailPage, ItemEditPage],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    UniItemsRoutingModule,
    SharedModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UniItemsModule {}
