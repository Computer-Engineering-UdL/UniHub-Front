import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { getInterestTranslationPath, getCategoryTranslationPath } from '../../utils/interest-translation.util';

@Pipe({
  name: 'interestTranslate',
  standalone: false,
  pure: false
})
export class InterestTranslatePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(value: string, type: 'interest' | 'category' = 'interest'): string {
    if (!value) return '';

    const key = type === 'category' ? getCategoryTranslationPath(value) : getInterestTranslationPath(value);

    return this.translate.instant(key);
  }
}
