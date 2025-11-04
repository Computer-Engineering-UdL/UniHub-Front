import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { IonicModule, ModalController, PopoverController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { from, map, Observable } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { Channel, ChannelCategory, CreateChannelDto, UpdateChannelDto } from '../../models/channel.types';
import NotificationService from '../../services/notification.service';
import { EmojiPickerPopoverComponent } from '../emoji-picker-popover/emoji-picker-popover.component';

@Component({
  selector: 'app-create-channel-modal',
  templateUrl: './create-channel-modal.component.html',
  styleUrls: ['./create-channel-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, TranslateModule]
})
export class CreateChannelModalComponent implements OnInit {
  private formBuilder: FormBuilder = inject(FormBuilder);
  private modalController: ModalController = inject(ModalController);
  private popoverController: PopoverController = inject(PopoverController);
  private channelService: ChannelService = inject(ChannelService);
  private translate: TranslateService = inject(TranslateService);
  private notificationService: NotificationService = inject(NotificationService);

  @Input() channel?: Channel;

  channelForm!: FormGroup;
  isSubmitting: boolean = false;
  isEditMode: boolean = false;
  selectedEmoji: string = '';

  readonly categories: ChannelCategory[] = ['General', 'Engineering', 'Sciences', 'Business', 'Arts', 'Medicine'];

  ngOnInit(): void {
    this.isEditMode = !!this.channel;

    if (this.channel?.emoji) {
      this.selectedEmoji = this.channel.emoji.trim();
    }

    this.channelForm = this.formBuilder.group({
      name: [
        this.channel?.name || '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
        this.isEditMode ? [] : [this.channelNameValidator()]
      ],
      description: [
        this.channel?.description || '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(200)]
      ],
      category: [this.channel?.category || 'General', Validators.required]
    });
  }

  private channelNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return new Observable((observer) => {
          observer.next(null);
          observer.complete();
        });
      }

      return from(this.channelService.fetchChannels()).pipe(
        map((channels: Channel[]) => {
          const nameExists: boolean = channels.some(
            (channel: Channel): boolean => channel.name.toLowerCase() === control.value.toLowerCase()
          );
          return nameExists ? { channelExists: true } : null;
        })
      );
    };
  }

  async openEmojiPicker(event: Event): Promise<void> {
    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: EmojiPickerPopoverComponent,
      event: event,
      translucent: true,
      cssClass: 'emoji-picker-popover-wrapper',
      componentProps: {
        currentEmoji: this.selectedEmoji || null
      }
    });

    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (data !== undefined) {
      this.selectedEmoji = data;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.channelForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    try {
      const formValues = this.channelForm.value;
      const channelName: string = this.selectedEmoji ? `${this.selectedEmoji} ${formValues.name}` : formValues.name;

      if (this.isEditMode && this.channel) {
        const formData: UpdateChannelDto = {
          ...formValues,
          name: channelName
        };
        await this.channelService.updateChannel(this.channel.id, formData);
        await this.modalController.dismiss({ updated: true });
      } else {
        const formData: CreateChannelDto = {
          ...formValues,
          name: channelName
        };
        await this.channelService.createChannel(formData);
        await this.modalController.dismiss({ created: true });
      }
    } catch (error) {
      console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} channel:`, error);
      this.notificationService.error(
        this.isEditMode ? 'CHANNELS.ERROR.UPDATE_CHANNEL' : 'CHANNELS.ERROR.CREATE_CHANNEL'
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  async dismiss(): Promise<void> {
    await this.modalController.dismiss();
  }

  getCategoryTranslation(category: ChannelCategory): string {
    if (!category) {
      return this.translate.instant('CHANNELS.GENERAL');
    }
    return this.translate.instant(`CHANNELS.${category.toUpperCase()}`);
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.channelForm.get(fieldName);
    if (!control) {
      return '';
    }

    if (control.hasError('channelExists')) {
      return this.translate.instant('CHANNELS.MODAL.ERROR.NAME_EXISTS');
    }

    let minLength: number = 0;
    let maxLength: number = 0;

    const validators = (control as any)._rawValidators || [];

    for (const validator of validators) {
      const minTest = validator({ value: 'a' });
      if (minTest && minTest.minlength) {
        minLength = minTest.minlength.requiredLength;
      }

      const maxTest = validator({ value: 'a'.repeat(1000) });
      if (maxTest && maxTest.maxlength) {
        maxLength = maxTest.maxlength.requiredLength;
      }
    }

    return this.translate.instant('COMMON.VALIDATION.FIELD_REQUIRED', {
      min: minLength,
      max: maxLength
    });
  }
}
