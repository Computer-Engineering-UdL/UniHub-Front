import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Interest } from '../../models/auth.types';

@Component({
  selector: 'app-add-interest-modal',
  templateUrl: './add-interest-modal.component.html',
  styleUrls: ['./add-interest-modal.component.scss'],
  standalone: false
})
export class AddInterestModalComponent {
  @Input() availableInterests: Interest[] = [];
  @Input() onAdd!: (interest: Interest) => Promise<void>;

  searchTerm: string = '';

  constructor(private modalCtrl: ModalController) {}

  get filteredInterests(): Interest[] {
    if (!this.searchTerm) {
      return this.availableInterests;
    }
    const term: string = this.searchTerm.toLowerCase();
    return this.availableInterests.filter((interest: Interest): boolean => interest.name.toLowerCase().includes(term));
  }

  async selectInterest(interest: Interest): Promise<void> {
    if (this.onAdd) {
      await this.onAdd(interest);
    }
    await this.modalCtrl.dismiss();
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
