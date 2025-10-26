import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChannelService } from '../../services/channel.service';
import { ChannelCategory, CreateChannelDto } from '../../models/channel.types';
import { NotificationService } from '../../services/notification.service';

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
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      category: ['General', Validators.required]
    });
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
      await this.notificationService.error('CHANNELS.ERROR.CREATE_CHANNEL');
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
