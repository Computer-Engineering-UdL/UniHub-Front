import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LocalizationService } from './services/localization.service';
import { AuthService } from './services/auth.service';
import { MessageService } from './services/message.service';
import { AvatarCacheService } from './services/avatar-cache.service';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let mockLocalizationService: jasmine.SpyObj<LocalizationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockAvatarCacheService: jasmine.SpyObj<AvatarCacheService>;

  beforeEach(async () => {
    mockLocalizationService = jasmine.createSpyObj('LocalizationService', ['syncLanguage']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['initialize']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['init']);
    mockAvatarCacheService = jasmine.createSpyObj('AvatarCacheService', ['init', 'clearExpiredCache']);

    mockLocalizationService.syncLanguage.and.returnValue(Promise.resolve());
    mockAuthService.initialize.and.returnValue(Promise.resolve());
    mockAvatarCacheService.init.and.returnValue(Promise.resolve());
    mockAvatarCacheService.clearExpiredCache.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: AvatarCacheService, useValue: mockAvatarCacheService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize services in constructor', () => {
    TestBed.createComponent(AppComponent);

    expect(mockLocalizationService.syncLanguage).toHaveBeenCalled();
    expect(mockAuthService.initialize).toHaveBeenCalled();
    expect(mockAvatarCacheService.init).toHaveBeenCalled();
  });
});
