import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChannelsPage } from './channels.page';
import { ChannelService } from '../services/channel.service';
import { AuthService } from '../services/auth.service';
import { ModalController, AlertController } from '@ionic/angular';
import NotificationService from '../services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

describe('ChannelsPage', () => {
  let component: ChannelsPage;
  let fixture: ComponentFixture<ChannelsPage>;

  const mockChannels = [
    {
      id: '1',
      name: 'General',
      description: 'desc1',
      category: 'General',
      member_count: 5,
      is_member: true,
      emoji: '💬'
    },
    {
      id: '2',
      name: 'Eng',
      description: 'desc2',
      category: 'Engineering',
      member_count: 2,
      is_member: false,
      emoji: '🔧'
    }
  ];

  const channelServiceStub = {
    fetchChannels: jasmine.createSpy('fetchChannels').and.returnValue(Promise.resolve(mockChannels)),
    getChannelMembers: jasmine.createSpy('getChannelMembers').and.returnValue(Promise.resolve([])),
    joinChannel: jasmine.createSpy('joinChannel').and.returnValue(Promise.resolve()),
    leaveChannel: jasmine.createSpy('leaveChannel').and.returnValue(Promise.resolve()),
    deleteChannel: jasmine.createSpy('deleteChannel').and.returnValue(Promise.resolve())
  };

  const currentUserSubject = new Subject<any>();
  const authServiceStub = {
    currentUser$: currentUserSubject.asObservable(),
    currentUser: { id: 'u1', role: 'Basic' }
  };

  const modalControllerStub = {
    create: jasmine
      .createSpy('create')
      .and.returnValue(
        Promise.resolve({ present: () => Promise.resolve(), onWillDismiss: () => Promise.resolve({ data: {} }) })
      )
  };
  const alertControllerStub = {
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ present: () => Promise.resolve() }))
  };
  const notificationServiceStub = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
  const translateServiceStub = { instant: (k: string) => k };
  const routerStub = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve()) as any };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChannelsPage],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ChannelService, useValue: channelServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ModalController, useValue: modalControllerStub },
        { provide: AlertController, useValue: alertControllerStub },
        { provide: NotificationService, useValue: notificationServiceStub },
        { provide: TranslateService, useValue: translateServiceStub },
        { provide: Router, useValue: routerStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelsPage);
    component = fixture.componentInstance;
  });

  it('should load channels on init and set counts', async () => {
    await component.ngOnInit();
    expect(channelServiceStub.fetchChannels).toHaveBeenCalled();
    expect(component.channels.length).toBe(2);
    expect(component.myChannelsCount).toBe(1);
    expect(component.exploreChannelsCount).toBe(2);
  });

  it('should filter channels by search query', async () => {
    component.channels = mockChannels as any;
    component.searchQuery = 'general';
    component.filterChannels();
    expect(component.filteredChannels.length).toBe(1);
    expect(component.filteredChannels[0].name).toBe('General');
  });

  it('getCategoryIcon and emoji fallbacks', () => {
    expect(component.getCategoryIcon('Engineering' as any)).toContain('construct');
    expect(component.getCategoryEmoji('Arts' as any)).toBe('🎨');
    expect(component.getChannelEmoji({} as any)).toBe('💬');
  });

  it('navigateToChannelDetail requires membership', () => {
    const ch: any = { is_member: false, id: '2' };
    component.currentUser = null;
    component.navigateToChannelDetail(ch);
    expect(routerStub.navigate).not.toHaveBeenCalledWith(['/channels', '2']);

    ch.is_member = true;
    component.currentUser = { id: 'u1' } as any;
    component.navigateToChannelDetail(ch);
    expect(routerStub.navigate).toHaveBeenCalled();
  });
});
