import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
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
  @Input() onToggle!: (interest: Interest, isSelected: boolean) => Promise<void>;

  searchTerm: string = '';
  filteredCategories: FilteredCategory[] = [];
  readonly MAX_INTERESTS = 10;

  constructor(
    private modalCtrl: ModalController,
    private translate: TranslateService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    // Check if user has more than maximum interests and remove excess
    if (this.userInterestIds.length > this.MAX_INTERESTS) {
      await this.removeExcessInterests();
    }
    this.updateFilteredCategories();
  }

  private async removeExcessInterests(): Promise<void> {
    const excessCount = this.userInterestIds.length - this.MAX_INTERESTS;
    const interestsToRemove = this.userInterestIds.slice(this.MAX_INTERESTS);

    // Find the actual Interest objects to remove
    for (const interestId of interestsToRemove) {
      const interest = this.findInterestById(interestId);
      if (interest && this.onToggle) {
        await this.onToggle(interest, true); // true means it's currently selected, so remove it
      }
    }

    // Update local state to keep only the first MAX_INTERESTS
    this.userInterestIds = this.userInterestIds.slice(0, this.MAX_INTERESTS);

    // Show notification about removed interests
    if (excessCount > 0) {
      await this.showExcessRemovedToast(excessCount);
    }
  }

  private findInterestById(interestId: string): Interest | undefined {
    for (const category of this.availableCategories) {
      const found = category.interests.find((i) => i.id === interestId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private async showExcessRemovedToast(count: number): Promise<void> {
    const message = this.translate.instant('PROFILE.INTERESTS.EXCESS_REMOVED', {
      count,
      max: this.MAX_INTERESTS
    });
    const toast = await this.toastCtrl.create({
      message: message || `${count} interests were removed to meet the maximum limit of ${this.MAX_INTERESTS}`,
      duration: 4000,
      position: 'top',
      color: 'warning',
      icon: 'information-circle'
    });
    await toast.present();
  }

  onSearchChange(): void {
    this.updateFilteredCategories();
  }

  private updateFilteredCategories(): void {
    const term: string = this.searchTerm.toLowerCase().trim();

    this.filteredCategories = this.availableCategories
      .map((category: InterestCategory): FilteredCategory => {
        // Show ALL interests
        const allInterests: Interest[] = category.interests;

        if (!term) {
          return {
            category,
            interests: allInterests
          };
        }

        // Filter by search term
        const filtered: Interest[] = allInterests.filter((interest: Interest): boolean => {
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

  isInterestSelected(interestId: string): boolean {
    return this.userInterestIds.includes(interestId);
  }

  async toggleInterest(interest: Interest): Promise<void> {
    const isSelected = this.isInterestSelected(interest.id);

    if (!isSelected && this.userInterestIds.length >= this.MAX_INTERESTS) {
      await this.showMaxLimitToast();
      return;
    }

    if (this.onToggle) {
      await this.onToggle(interest, isSelected);
    }

    // Update local state
    if (isSelected) {
      const index = this.userInterestIds.indexOf(interest.id);
      if (index > -1) {
        this.userInterestIds.splice(index, 1);
      }
    } else {
      this.userInterestIds.push(interest.id);
    }
  }

  private async showMaxLimitToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('PROFILE.INTERESTS.MAX_LIMIT_REACHED', { max: this.MAX_INTERESTS }),
      duration: 3000,
      position: 'top',
      color: 'warning',
      icon: 'warning'
    });
    await toast.present();
  }

  getCategoryEmoji(categoryName: string): string {
    const emojiMap: { [key: string]: string } = {
      'Academics & Learning': '📚',
      'Arts & Culture': '🎨',
      'Career & Entrepreneurship': '💼',
      'Finance & Investing (students)': '💰',
      'Food, Coffee & Lifestyle': '☕',
      'Housing & Daily Life': '🏠',
      'Mobility & Carpool': '🚗',
      'Social, Events & Nightlife': '🎉',
      'Sports & Fitness': '⚽',
      'Tech, Maker & Gaming': '💻',
      'Travel & Languages': '✈️',
      'Volunteering & Sustainability': '🌱',
      'Wellbeing & Mindfulness': '🧘'
    };
    return emojiMap[categoryName] || '📌';
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
