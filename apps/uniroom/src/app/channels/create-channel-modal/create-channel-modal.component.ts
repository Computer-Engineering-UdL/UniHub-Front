import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChannelService } from '../../services/channel.service';
import { ChannelCategory, CreateChannelDto } from '../../models/channel.types';

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
  private toastController: ToastController = inject(ToastController);
  private translate: TranslateService = inject(TranslateService);

  channelForm!: FormGroup;
  isSubmitting: boolean = false;

  readonly categories: ChannelCategory[] = [
    'General',
    'Engineering',
    'Sciences',
    'Business',
    'Arts',
    'Medicine'
  ];

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
      await this.showToast(this.translate.instant('CHANNELS.ERROR.CREATE_CHANNEL'), 'danger');
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

  private async showToast(message: string, color: string): Promise<void> {
    const toast: HTMLIonToastElement = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
