import { Component, Input, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { User, Interest, DEFAULT_USER_URL } from '../models/auth.types';
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

  availableInterests: Interest[] = [];
  userInterests: Interest[] = [];
  loadingInterests = false;
  saving = false;

  avatarSrc: string = DEFAULT_USER_URL;

  constructor(
    private modalCtrl: ModalController,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.user) return;
    this.avatarSrc = this.computeAvatarSrc();
    await this.loadAvailableInterests();
    await this.loadUserInterests(this.user.id);
  }

  onImgUrlInput(value: string): void {
    if (!this.user) return;
    this.user.imgUrl = value;
    this.avatarSrc = this.computeAvatarSrc();
  }

  onNameInput(): void {
    if (!this.user) return;
    if (!this.user.imgUrl) {
      this.avatarSrc = this.computeAvatarSrc();
    }
  }

  async loadAvailableInterests(): Promise<void> {
    try {
      this.loadingInterests = true;
      this.availableInterests = await this.auth.getAllInterests();
    } catch (_) {
      this.availableInterests = [];
    } finally {
      this.loadingInterests = false;
    }
  }

  async loadUserInterests(userId: string): Promise<void> {
    try {
      this.userInterests = await this.auth.getUserInterests(userId);
    } catch (_) {
      this.userInterests = [];
    }
  }

  isUserHasInterest(id: string): boolean {
    return this.userInterests.some((i) => i.id === id);
  }

  async toggleInterest(interest: Interest): Promise<void> {
    if (!this.user) return;
    try {
      if (this.isUserHasInterest(interest.id)) {
        await this.auth.removeInterestFromUser(this.user.id, interest.id);
      } else {
        await this.auth.addInterestToUser(this.user.id, interest.id);
      }
      await this.loadUserInterests(this.user.id);
    } catch (_) {}
  }

  computeAvatarSrc(): string {
    if (this.user && this.user.imgUrl) return this.user.imgUrl;
    const first = this.user?.firstName?.trim() || '';
    const last = this.user?.lastName?.trim() || '';
    const name =
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
      const updated = await this.auth.updateCurrentUser(payload);
      updated.interests = await this.auth.getUserInterests(updated.id);
      await this.modalCtrl.dismiss({ saved: true, user: updated });
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
