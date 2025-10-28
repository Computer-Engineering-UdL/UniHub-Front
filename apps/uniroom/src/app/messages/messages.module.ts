import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MessagesPage } from './messages.page';
import { ConversationComponent } from './conversation/conversation.component';

const routes: Routes = [
  {
    path: '',
    component: MessagesPage
  },
  {
    path: 'conversation/:id',
    component: ConversationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes), MessagesPage, ConversationComponent]
})
export class MessagesModule {}
