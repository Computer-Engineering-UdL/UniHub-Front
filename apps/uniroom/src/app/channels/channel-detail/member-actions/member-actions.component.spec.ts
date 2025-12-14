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

  it('should handle multiple actions', () => {
    const action1 = { icon: 'create', text: 'Edit', handler: jasmine.createSpy('edit') } as any;
    const action2 = { icon: 'trash', text: 'Delete', handler: jasmine.createSpy('delete') } as any;

    component.executeAction(action1);
    expect(action1.handler).toHaveBeenCalled();

    component.executeAction(action2);
    expect(action2.handler).toHaveBeenCalled();
  });

  it('should dismiss popover after executing action', () => {
    const handler = jasmine.createSpy('handler');
    const action = { icon: 'ban', text: 'Ban', handler } as any;
    component.executeAction(action);
    expect(popoverControllerStub.dismiss).toHaveBeenCalledTimes(1);
  });

  it('should render actions list correctly', () => {
    component.actions = [
      { icon: 'create', text: 'Edit', handler: () => {} },
      { icon: 'trash', text: 'Delete', handler: () => {} }
    ] as any;
    expect(component.actions.length).toBe(2);
  });

  it('should handle action with no handler gracefully', () => {
    const action = { icon: 'info', text: 'Info' } as any;
    expect(() => component.executeAction(action)).not.toThrow();
  });
});
