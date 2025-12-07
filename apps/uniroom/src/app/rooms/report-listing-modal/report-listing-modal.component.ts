import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ReportReason } from '../../models/report.types';

interface ReportReasonOption {
  value: ReportReason;
  labelKey: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-report-listing-modal',
  templateUrl: './report-listing-modal.component.html',
  styleUrls: ['./report-listing-modal.component.scss'],
  standalone: false
})
export class ReportListingModalComponent {
  private readonly modalController: ModalController = inject(ModalController);

  selectedReason: ReportReason = ReportReason.SCAM_FRAUD;
  description: string = '';
  step: 'reason' | 'description' = 'reason';

  readonly reasons: ReportReasonOption[] = [
    {
      value: ReportReason.SCAM_FRAUD,
      labelKey: 'ROOM.REPORT.REASONS.SCAM_FRAUD',
      icon: 'warning',
      color: 'danger'
    },
    {
      value: ReportReason.FAKE_LISTING,
      labelKey: 'ROOM.REPORT.REASONS.FAKE_LISTING',
      icon: 'ban',
      color: 'danger'
    },
    {
      value: ReportReason.INAPPROPRIATE_CONTENT,
      labelKey: 'ROOM.REPORT.REASONS.INAPPROPRIATE_CONTENT',
      icon: 'eye-off',
      color: 'warning'
    },
    {
      value: ReportReason.SPAM,
      labelKey: 'ROOM.REPORT.REASONS.SPAM',
      icon: 'mail',
      color: 'warning'
    },
    {
      value: ReportReason.OTHER,
      labelKey: 'ROOM.REPORT.REASONS.OTHER',
      icon: 'ellipsis-horizontal',
      color: 'medium'
    }
  ];

  selectReason(reason: ReportReason): void {
    this.selectedReason = reason;
  }

  nextStep(): void {
    this.step = 'description';
  }

  previousStep(): void {
    this.step = 'reason';
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  submit(): void {
    void this.modalController.dismiss(
      {
        reason: this.selectedReason,
        description: this.description.trim() || undefined
      },
      'submit'
    );
  }
}
