import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberActionsComponent, MemberAction } from './member-actions.component';
import { PopoverController } from '@ionic/angular';
import { Type } from '@angular/core';

describe('MemberActionsComponent', () => {
  let component: MemberActionsComponent;
  let fixture: ComponentFixture<MemberActionsComponent>;

  const popoverControllerStub = { dismiss: jasmine.createSpy('dismiss') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MemberActionsComponent],
      providers: [{ provide: PopoverController, useValue: popoverControllerStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberActionsComponent as Type<MemberActionsComponent>);
    component = fixture.componentInstance;
  });

  it('executeAction should call handler and dismiss', () => {
    const handler = jasmine.createSpy('handler');
    const action: MemberAction = { icon: 'trash', text: 'Delete', handler };
    component.executeAction(action);
    expect(handler).toHaveBeenCalled();
    expect(popoverControllerStub.dismiss).toHaveBeenCalled();
  });

  it('should handle multiple actions', () => {
    const action1: MemberAction = { icon: 'create', text: 'Edit', handler: jasmine.createSpy('edit') };
    const action2: MemberAction = { icon: 'trash', text: 'Delete', handler: jasmine.createSpy('delete') };

    component.executeAction(action1);
    expect(action1.handler).toHaveBeenCalled();

    component.executeAction(action2);
    expect(action2.handler).toHaveBeenCalled();
  });

  it('should dismiss popover after executing action', () => {
    const handler = jasmine.createSpy('handler');
    const action: MemberAction = { icon: 'ban', text: 'Ban', handler };
    component.executeAction(action);
    expect(popoverControllerStub.dismiss).toHaveBeenCalledTimes(1);
  });

  it('should render actions list correctly', () => {
    component.actions = [
      { icon: 'create', text: 'Edit', handler: () => {} },
      { icon: 'trash', text: 'Delete', handler: () => {} }
    ];
    expect(component.actions.length).toBe(2);
  });

  it('should handle action with no handler gracefully', () => {
    const action: Partial<MemberAction> = { icon: 'info', text: 'Info' };
    expect(() => component.executeAction(action as MemberAction)).not.toThrow();
  });
});
