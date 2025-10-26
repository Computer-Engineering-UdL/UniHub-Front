import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChannelService } from '../services/channel.service';
import { AuthService } from '../services/auth.service';
import { Channel, ChannelCategory } from '../models/channel.types';
import { User } from '../models/auth.types';
import { CreateChannelModalComponent } from './create-channel-modal/create-channel-modal.component';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-channels',
  templateUrl: './channels.page.html',
  styleUrls: ['./channels.page.scss'],
  standalone: false
})
export class ChannelsPage implements OnInit, OnDestroy {
  private channelService: ChannelService = inject(ChannelService);
  private authService: AuthService = inject(AuthService);
  private modalController: ModalController = inject(ModalController);
  private alertController: AlertController = inject(AlertController);
  private notificationService: NotificationService = inject(NotificationService);
  private translate: TranslateService = inject(TranslateService);
  private router: Router = inject(Router);

  private userSubscription?: Subscription;

  channels: Channel[] = [];
  filteredChannels: Channel[] = [];
  currentUser: User | null = null;
  isLoading: boolean = true;
  searchQuery: string = '';
  selectedTab: 'explore' | 'myChannels' = 'explore';
  selectedCategory: ChannelCategory | 'All' = 'All';
  isAdminMode: boolean = false;

  readonly categories: (ChannelCategory | 'All')[] = [
    'All',
    'General',
    'Engineering',
    'Sciences',
    'Business',
    'Arts',
    'Medicine'
  ];

  async ngOnInit(): Promise<void> {
    this.userSubscription = this.authService.currentUser$.subscribe(async (user: User | null): Promise<void> => {
      const previousUser: User | null = this.currentUser;
      this.currentUser = user;

      // If user auth changed
      if ((previousUser === null && user !== null) || (previousUser !== null && user === null)) {
        if (this.currentUser) {
          this.selectedTab = 'myChannels';
        } else {
          this.selectedTab = 'explore';
        }

        await this.loadChannels();
      }
    });

    this.currentUser = this.authService.currentUser;
    if (this.currentUser) {
      this.selectedTab = 'myChannels';
    }
    await this.loadChannels();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  async loadChannels(): Promise<void> {
    this.isLoading = true;
    try {
      this.channels = await this.channelService.fetchChannels();
      this.filterChannels();
    } catch (error) {
      console.error('Error loading channels:', error);
      await this.notificationService.error('CHANNELS.ERROR.LOAD_CHANNELS');
    } finally {
      this.isLoading = false;
    }
  }

  filterChannels(): void {
    let filtered: Channel[] = [...this.channels];

    if (this.selectedTab === 'myChannels') {
      filtered = filtered.filter((channel: Channel): boolean | undefined => channel.is_member);
    }

    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter((channel: Channel): boolean => channel.category === this.selectedCategory);
    }

    if (this.searchQuery.trim()) {
      const query: string = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (channel: Channel): boolean =>
          channel.name.toLowerCase().includes(query) || channel.description.toLowerCase().includes(query)
      );
    }

    this.filteredChannels = filtered;
  }

  onSearchChange(event: any): void {
    this.searchQuery = event.detail.value || '';
    this.filterChannels();
  }

  async onTabChange(tab: 'explore' | 'myChannels'): Promise<void> {
    this.selectedTab = tab;
    await this.loadChannels();
  }

  onCategoryChange(category: ChannelCategory | 'All'): void {
    this.selectedCategory = category;
    this.filterChannels();
  }

  async openCreateChannelModal(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: CreateChannelModalComponent
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created) {
      await this.loadChannels();
      await this.notificationService.success('CHANNELS.SUCCESS.CREATE_CHANNEL');
    }
  }

  async joinChannel(channel: Channel): Promise<void> {
    if (!this.currentUser) {
      await this.router.navigate(['/login']);
      return;
    }

    try {
      await this.channelService.joinChannel(channel.id, this.currentUser.id);
      await this.notificationService.success('CHANNELS.SUCCESS.JOIN_CHANNEL');
      await this.loadChannels();
      this.selectedTab = 'myChannels';
      this.filterChannels();
    } catch (error) {
      console.error('Error joining channel:', error);
      await this.notificationService.error('CHANNELS.ERROR.JOIN_CHANNEL');
    }
  }

  async leaveChannel(channel: Channel): Promise<void> {
    if (!this.currentUser) return;

    try {
      await this.channelService.leaveChannel(channel.id, this.currentUser.id);
      await this.notificationService.success('CHANNELS.SUCCESS.LEAVE_CHANNEL');
      await this.loadChannels();
    } catch (error) {
      console.error('Error leaving channel:', error);
      await this.notificationService.error('CHANNELS.ERROR.LEAVE_CHANNEL');
    }
  }

  async deleteChannel(channel: Channel): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: this.translate.instant('CHANNELS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('CHANNELS.DELETE_CONFIRM_MESSAGE', { name: channel.name }),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async () => {
            try {
              await this.channelService.deleteChannel(channel.id);
              await this.notificationService.success('CHANNELS.SUCCESS.DELETE_CHANNEL');
              await this.loadChannels();
            } catch (error) {
              console.error('Error deleting channel:', error);
              await this.notificationService.error('CHANNELS.ERROR.DELETE_CHANNEL');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getCategoryTranslation(category: string): string {
    return this.translate.instant(`CHANNELS.${category.toUpperCase()}`);
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'Admin';
  }
}
