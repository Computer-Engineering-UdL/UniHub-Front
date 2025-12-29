import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { getUniversityTranslationPath, getFacultyTranslationPath } from '../../utils/university-translation.util';

type UniversityTranslateType = 'university' | 'faculty';

@Pipe({
  name: 'universityTranslate',
  standalone: false,
  pure: false
})
export class UniversityTranslatePipe implements PipeTransform {
  private readonly translate: TranslateService = inject(TranslateService);

  transform(value: string, type: UniversityTranslateType = 'university'): string {
    if (!value) {
      return '';
    }

    const key: string = type === 'faculty' ? getFacultyTranslationPath(value) : getUniversityTranslationPath(value);

    return this.translate.instant(key);
  }
}
