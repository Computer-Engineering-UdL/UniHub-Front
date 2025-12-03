import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';
import { ItemsListPage } from './items-list/items-list.page';
import { ItemDetailPage } from './item-detail/item-detail.page';
import { ItemEditPage } from './item-edit/item-edit.page';

const routes: Routes = [
  {
    path: '',
    component: ItemsListPage,
    data: { public: true, titleKey: 'TOPBAR.UNIITEMS' }
  },
  {
    path: 'new',
    component: ItemEditPage,
    canActivate: [AuthGuard],
    data: { titleKey: 'UNI_ITEMS.FORM.TITLE_NEW' }
  },
  {
    path: ':id/edit',
    component: ItemEditPage,
    canActivate: [AuthGuard],
    data: { titleKey: 'UNI_ITEMS.FORM.TITLE_EDIT' }
  },
  {
    path: ':id',
    component: ItemDetailPage,
    data: { public: true, titleKey: 'UNI_ITEMS.DETAIL.TITLE' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UniItemsRoutingModule {}
