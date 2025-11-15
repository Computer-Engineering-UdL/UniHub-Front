import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelMember } from '../../../models/channel.types';

@Component({
  selector: 'app-ban-member-modal',
  templateUrl: './ban-member-modal.component.html',
  styleUrls: ['./ban-member-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class BanMemberModalComponent {
  @Input() member!: ChannelMember;

  private modalController: ModalController = inject(ModalController);

  motive: string = '';
  durationDays: number = 7;

  dismiss(): void {
    void this.modalController.dismiss();
  }

  async confirm(): Promise<void> {
    if (!this.motive || this.motive.trim().length < 3) {
      return;
    }

    await this.modalController.dismiss({
      confirmed: true,
      motive: this.motive.trim(),
      duration_days: this.durationDays
    });
  }

  get isValid(): boolean {
    return this.motive.trim().length >= 3;
  }
}

