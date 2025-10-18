import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { DEFAULT_USER_URL, User } from '../models/auth.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-edit-modal',
  templateUrl: './profile-edit.modal.html',
  styleUrls: ['./profile-edit.modal.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TranslateModule]
})
export class ProfileEditModal implements OnInit {
  @Input() user!: User;

  saving: boolean = false;
  avatarSrc: string = DEFAULT_USER_URL;

  constructor(
    private modalCtrl: ModalController,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.user) {
      return;
    }
    this.avatarSrc = this.computeAvatarSrc();
  }

  onImgUrlInput(value: string): void {
    if (!this.user) return;
    this.user.imgUrl = value;
    this.avatarSrc = this.computeAvatarSrc();
  }

  onNameInput(): void {
    if (!this.user) {
      return;
    }
    if (!this.user.imgUrl) {
      this.avatarSrc = this.computeAvatarSrc();
    }
  }

  computeAvatarSrc(): string {
    if (this.user && this.user.imgUrl) return this.user.imgUrl;
    const first: string = this.user?.firstName?.trim() || '';
    const last: string = this.user?.lastName?.trim() || '';
    const name: string =
      first || last
        ? encodeURIComponent((first + ' ' + last).trim())
        : encodeURIComponent(this.user?.username || 'user');
    return `https://avatar.iran.liara.run/username?username=${name}`;
  }

  onAvatarError(): void {
    this.avatarSrc = DEFAULT_USER_URL;
  }

  async save(): Promise<void> {
    if (!this.user) {
      return;
    }
    this.saving = true;
    try {
      const payload: Partial<User> = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        phone: this.user.phone,
        university: this.user.university,
        imgUrl: this.user.imgUrl,
        yearOfStudy: this.user.yearOfStudy
      };
      const updatedUser: User = await this.auth.updateCurrentUser(payload);
      await this.modalCtrl.dismiss({ saved: true, user: updatedUser });
    } catch (_) {
      await this.modalCtrl.dismiss({ saved: false });
    } finally {
      this.saving = false;
    }
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss({ saved: false });
  }
}
