import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { OnboardingRoutingModule } from './onboarding-routing.module';
import { RoleSelectionPage } from './role-selection/role-selection.page';
import { StudentOnboardingPage } from './student/student-onboarding.page';
import { LandlordOnboardingPage } from './landlord/landlord-onboarding.page';
import { CompanyOnboardingPage } from './company/company-onboarding.page';
import { InterestTranslatePipe } from '../shared/pipes/interest-translate.pipe';

@NgModule({
  declarations: [
    RoleSelectionPage,
    StudentOnboardingPage,
    LandlordOnboardingPage,
    CompanyOnboardingPage,
    InterestTranslatePipe
  ],
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, OnboardingRoutingModule]
})
export class OnboardingModule {}
