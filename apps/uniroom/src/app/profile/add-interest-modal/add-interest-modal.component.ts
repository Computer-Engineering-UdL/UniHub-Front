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
  @Input() onToggle!: (interest: Interest, isSelected: boolean) => Promise<void>;

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
