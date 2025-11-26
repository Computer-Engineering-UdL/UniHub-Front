import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { LocalizationService } from './services/localization.service';
import { AuthService } from './services/auth.service';

import { AppComponent } from './app.component';

class MockTranslateService {
  addLangs() {}
  setFallbackLang() {}
  use() { return { toPromise: async () => {} } as any; }
  getBrowserLang() { return 'en'; }
}

class MockLocalizationService {
  async syncLanguage(): Promise<void> {}
}

class MockAuthService {
  async initialize(): Promise<void> {}
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: LocalizationService, useClass: MockLocalizationService },
        { provide: AuthService, useClass: MockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
