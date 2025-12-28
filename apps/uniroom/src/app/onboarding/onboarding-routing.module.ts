import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleSelectionPage } from './role-selection/role-selection.page';
import { StudentOnboardingPage } from './student/student-onboarding.page';
import { LandlordOnboardingPage } from './landlord/landlord-onboarding.page';
import { CompanyOnboardingPage } from './company/company-onboarding.page';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'role'
  },
  {
    path: 'role',
    component: RoleSelectionPage,
    data: { skipOnboardingCheck: true }
  },
  {
    path: 'student',
    component: StudentOnboardingPage,
    data: { skipOnboardingCheck: true }
  },
  {
    path: 'landlord',
    component: LandlordOnboardingPage,
    data: { skipOnboardingCheck: true }
  },
  {
    path: 'company',
    component: CompanyOnboardingPage,
    data: { skipOnboardingCheck: true }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule {}
