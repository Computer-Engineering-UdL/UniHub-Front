import { Component, inject, OnInit } from '@angular/core';
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
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { from, map, Observable } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { Channel, ChannelCategory, CreateChannelDto } from '../../models/channel.types';
import NotificationService from '../../services/notification.service';

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
  private channelService: ChannelService = inject(ChannelService);
  private translate: TranslateService = inject(TranslateService);
  private notificationService: NotificationService = inject(NotificationService);

  channelForm!: FormGroup;
  isSubmitting: boolean = false;

  readonly categories: ChannelCategory[] = ['General', 'Engineering', 'Sciences', 'Business', 'Arts', 'Medicine'];

  ngOnInit(): void {
    this.channelForm = this.formBuilder.group({
      name: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
        [this.channelNameValidator()]
      ],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      category: ['General', Validators.required]
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

  async onSubmit(): Promise<void> {
    if (this.channelForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    try {
      const formData: CreateChannelDto = this.channelForm.value;
      await this.channelService.createChannel(formData);
      await this.modalController.dismiss({ created: true });
    } catch (error) {
      console.error('Error creating channel:', error);
      this.notificationService.error('CHANNELS.ERROR.CREATE_CHANNEL');
    } finally {
      this.isSubmitting = false;
    }
  }

  async dismiss(): Promise<void> {
    await this.modalController.dismiss();
  }

  getCategoryTranslation(category: string): string {
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
