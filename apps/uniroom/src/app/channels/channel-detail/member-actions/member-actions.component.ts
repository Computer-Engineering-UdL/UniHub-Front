import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelMember } from '../../../models/channel.types';

export interface MemberAction {
  icon: string;
  text: string;
  handler: () => void;
  isDestructive?: boolean;
  isSelected?: boolean;
}

@Component({
  selector: 'app-member-actions',
  templateUrl: './member-actions.component.html',
  styleUrls: ['./member-actions.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule]
})
export class MemberActionsComponent {
  @Input() member!: ChannelMember;
  @Input() actions: MemberAction[] = [];

  private popoverCtrl: PopoverController = inject(PopoverController);

  executeAction(action: MemberAction): void {
    action.handler();
    void this.popoverCtrl.dismiss();
  }
}
