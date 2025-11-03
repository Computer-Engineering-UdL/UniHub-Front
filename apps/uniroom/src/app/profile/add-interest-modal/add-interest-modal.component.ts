import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Interest, InterestCategory } from '../../models/auth.types';
import { getInterestTranslationPath } from '../../utils/interest-translation.util';

interface FilteredCategory {
  category: InterestCategory;
  interests: Interest[];
}

@Component({
  selector: 'app-add-interest-modal',
  templateUrl: './add-interest-modal.component.html',
  styleUrls: ['./add-interest-modal.component.scss'],
  standalone: false
})
export class AddInterestModalComponent implements OnInit {
  @Input() availableCategories: InterestCategory[] = [];
  @Input() userInterestIds: string[] = [];
  @Input() onAdd!: (interest: Interest) => Promise<void>;

  searchTerm: string = '';
  filteredCategories: FilteredCategory[] = [];

  constructor(
    private modalCtrl: ModalController,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.updateFilteredCategories();
  }

  onSearchChange(): void {
    this.updateFilteredCategories();
  }

  private updateFilteredCategories(): void {
    const term: string = this.searchTerm.toLowerCase().trim();

    this.filteredCategories = this.availableCategories
      .map((category: InterestCategory): FilteredCategory => {
        // Filter by the interests the user does not have
        const availableInterests: Interest[] = category.interests.filter(
          (interest: Interest): boolean => !this.userInterestIds.includes(interest.id)
        );

        if (!term) {
          return {
            category,
            interests: availableInterests
          };
        }

        const filtered: Interest[] = availableInterests.filter((interest: Interest): boolean => {
          const translatedName: string = this.getTranslatedInterestName(interest.name).toLowerCase();
          return translatedName.includes(term) || interest.name.toLowerCase().includes(term);
        });

        return {
          category,
          interests: filtered
        };
      })
      .filter((fc: FilteredCategory): boolean => fc.interests.length > 0);
  }

  private getTranslatedInterestName(interestName: string): string {
    return this.translate.instant(getInterestTranslationPath(interestName));
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
