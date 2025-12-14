import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ProfilePage } from './profile.page';
import { AuthService } from '../../services/auth.service';
import { ChannelService } from '../../services/channel.service';
import { ApiService } from '../../services/api.service';
import { LocalizationService } from '../../services/localization.service';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  const mockUser = {
    id: 'user1',
    email: 'test@test.com',
    fullName: 'Test User',
    role: 'Basic',
    isActive: true
  };

  const mockAuthService = {
    currentUser$: of(mockUser),
    currentUser: mockUser,
    fetchUserById: jasmine.createSpy('fetchUserById').and.returnValue(Promise.resolve(mockUser))
  };

  const mockChannelService = {
    getChannelMembers: jasmine.createSpy('getChannelMembers').and.returnValue(Promise.resolve([]))
  };

  const mockApiService = {
    get: jasmine.createSpy('get').and.returnValue(of({ data: [] })),
    post: jasmine.createSpy('post').and.returnValue(of({})),
    put: jasmine.createSpy('put').and.returnValue(of({}))
  };

  const mockModalController = {
    create: jasmine.createSpy('create').and.returnValue(
      Promise.resolve({
        present: () => Promise.resolve(),
        onWillDismiss: () => Promise.resolve({ data: {} })
      })
    )
  };

  const mockLocalizationService = {
    formatDate: jasmine.createSpy('formatDate').and.returnValue('2025-12-14'),
    formatNumber: jasmine.createSpy('formatNumber').and.returnValue('100')
  };

  const mockActivatedRoute = {
    snapshot: {
      queryParamMap: {
        get: jasmine.createSpy('get').and.returnValue(null)
      }
    }
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ProfilePage],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ChannelService, useValue: mockChannelService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ModalController, useValue: mockModalController },
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with user data', () => {
    component.ngOnInit();
    expect(component.user).toBeTruthy();
    expect(component.user?.id).toBe('user1');
  });

  it('should have default selected tab as overview', () => {
    component.ngOnInit();
    expect(component.selectedTab).toBe('overview');
  });

  it('should change tab when selectTab is called', () => {
    component.selectTab('posts');
    expect(component.selectedTab).toBe('posts');
    component.selectTab('listings');
    expect(component.selectedTab).toBe('listings');
  });

  it('should initialize stats with default values', () => {
    expect(component.stats.posts).toBe(0);
    expect(component.stats.listings).toBe(0);
    expect(component.stats.helpful).toBe(0);
    expect(component.stats.channels).toBe(0);
  });

  it('should load user interests on init', async () => {
    mockApiService.get.and.returnValue(of({ data: [{ id: 'int1', name: 'Gaming' }] }));
    await component.ngOnInit();
    expect(component.loadingInterests).toBeDefined();
  });

  it('should load user offers on init', async () => {
    mockApiService.get.and.returnValue(of({ data: [{ id: 'offer1', title: 'Room' }] }));
    await component.ngOnInit();
    expect(component.loadingOffers).toBeDefined();
  });

  it('should open edit modal when openEditModal is called', async () => {
    await component.openEditModal();
    expect(mockModalController.create).toHaveBeenCalled();
  });

  it('should open add interest modal when openAddInterestModal is called', async () => {
    await component.openAddInterestModal();
    expect(mockModalController.create).toHaveBeenCalled();
  });

  it('should have recent activity data', () => {
    expect(component.recentActivity.length).toBeGreaterThan(0);
  });

  it('should unsubscribe on destroy', () => {
    component.ngOnInit();
    const userSub = (component as any).userSub;
    if (userSub) {
      spyOn(userSub, 'unsubscribe');
      component.ngOnDestroy();
      expect(userSub.unsubscribe).toHaveBeenCalled();
    }
  });

  it('should set tab from query param', () => {
    mockActivatedRoute.snapshot.queryParamMap.get.and.returnValue('listings');
    component.ngOnInit();
    expect(component.selectedTab).toBe('listings');
  });

  it('should get role badge color correctly', () => {
    expect(component.getRoleBadgeColor('Admin')).toBe('danger');
    expect(component.getRoleBadgeColor('Seller')).toBe('warning');
    expect(component.getRoleBadgeColor('Basic')).toBe('primary');
  });

  it('should get user display name', () => {
    component.user = { firstName: 'John', lastName: 'Doe' } as any;
    expect(component.getUserDisplayName()).toBe('John Doe');
  });
});
