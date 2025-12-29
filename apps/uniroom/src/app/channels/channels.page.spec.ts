import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChannelsPage } from './channels.page';
import { ChannelService } from '../services/channel.service';
import { AuthService } from '../services/auth.service';
import { ModalController, AlertController } from '@ionic/angular';
import NotificationService from '../services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Channel, ChannelCategory } from '../models/channel.types';
import { User } from '../models/auth.types';

describe('ChannelsPage', () => {
  let component: ChannelsPage;
  let fixture: ComponentFixture<ChannelsPage>;

  const mockChannels: Partial<Channel>[] = [
    {
      id: '1',
      name: 'General',
      description: 'desc1',
      category: 'General' as ChannelCategory,
      member_count: 5,
      is_member: true,
      emoji: '💬'
    },
    {
      id: '2',
      name: 'Eng',
      description: 'desc2',
      category: 'Engineering' as ChannelCategory,
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

  const currentUserSubject = new Subject<User | null>();
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
  const routerStub = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve()) };

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
    component.channels = mockChannels as Channel[];
    component.searchQuery = 'general';
    component.filterChannels();
    expect(component.filteredChannels.length).toBe(1);
    expect(component.filteredChannels[0].name).toBe('General');
  });

  it('getCategoryIcon and emoji fallbacks', () => {
    expect(component.getCategoryIcon('Engineering' as ChannelCategory)).toContain('construct');
    expect(component.getCategoryEmoji('Arts' as ChannelCategory)).toBe('🎨');
    expect(component.getChannelEmoji({} as Channel)).toBe('💬');
  });

  it('navigateToChannelDetail requires membership', () => {
    const ch: Partial<Channel> = { is_member: false, id: '2' };
    component.currentUser = null;
    component.navigateToChannelDetail(ch as Channel);
    expect(routerStub.navigate).not.toHaveBeenCalledWith(['/channels', '2']);

    ch.is_member = true;
    component.currentUser = { id: 'u1' } as User;
    component.navigateToChannelDetail(ch as Channel);
    expect(routerStub.navigate).toHaveBeenCalled();
  });

  it('should join channel successfully', async () => {
    const channel: Partial<Channel> = { id: '2', name: 'Eng', is_member: false };
    await component.joinChannel(channel as Channel);
    expect(channelServiceStub.joinChannel).toHaveBeenCalledWith('2');
    expect(notificationServiceStub.success).toHaveBeenCalled();
  });

  it('should leave channel successfully', async () => {
    const channel: Partial<Channel> = { id: '1', name: 'General', is_member: true };
    await component.leaveChannel(channel as Channel);
    expect(channelServiceStub.leaveChannel).toHaveBeenCalledWith('1');
    expect(notificationServiceStub.success).toHaveBeenCalled();
  });

  it('should open create channel modal', async () => {
    await component.openCreateChannelModal();
    expect(modalControllerStub.create).toHaveBeenCalled();
  });

  it('should open edit channel modal with channel data', async () => {
    const channel: Partial<Channel> = { id: '1', name: 'General' };
    await component.editChannel(channel as Channel);
    expect(modalControllerStub.create).toHaveBeenCalled();
  });

  it('should delete channel after confirmation', async () => {
    const channel: Partial<Channel> = { id: '1', name: 'General' };
    await component.deleteChannel(channel as Channel);
    expect(alertControllerStub.create).toHaveBeenCalled();
  });

  it('should filter by category using onCategoryChange', () => {
    component.channels = mockChannels as Channel[];
    component.onCategoryChange('Engineering');
    expect(component.selectedCategory).toBe('Engineering');
  });

  it('should clear search when search query is empty', () => {
    component.channels = mockChannels as Channel[];
    component.searchQuery = '';
    component.filterChannels();
    expect(component.filteredChannels.length).toBe(component.channels.length);
  });

  it('should count my channels correctly', async () => {
    await component.ngOnInit();
    const myChannels = component.channels.filter((c) => c.is_member);
    expect(component.myChannelsCount).toBe(myChannels.length);
  });

  it('should handle empty channels list', async () => {
    channelServiceStub.fetchChannels.and.returnValue(Promise.resolve([]));
    await component.loadChannels();
    expect(component.channels.length).toBe(0);
    expect(component.myChannelsCount).toBe(0);
  });

  it('should show error notification on channel load failure', async () => {
    channelServiceStub.fetchChannels.and.returnValue(Promise.reject(new Error('Network error')));
    await component.loadChannels();
    expect(notificationServiceStub.error).toHaveBeenCalled();
  });
});
