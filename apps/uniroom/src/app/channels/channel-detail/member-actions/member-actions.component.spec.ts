import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberActionsComponent } from './member-actions.component';
import { PopoverController } from '@ionic/angular';

describe('MemberActionsComponent', () => {
  let component: MemberActionsComponent;
  let fixture: ComponentFixture<MemberActionsComponent>;

  const popoverControllerStub = { dismiss: jasmine.createSpy('dismiss') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MemberActionsComponent],
      providers: [{ provide: PopoverController, useValue: popoverControllerStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberActionsComponent as any);
    component = fixture.componentInstance;
  });

  it('executeAction should call handler and dismiss', () => {
    const handler = jasmine.createSpy('handler');
    const action = { icon: 'trash', text: 'Delete', handler } as any;
    component.executeAction(action);
    expect(handler).toHaveBeenCalled();
    expect(popoverControllerStub.dismiss).toHaveBeenCalled();
  });
});
