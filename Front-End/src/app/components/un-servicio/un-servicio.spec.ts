import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnServicio } from './un-servicio';

describe('UnServicio', () => {
  let component: UnServicio;
  let fixture: ComponentFixture<UnServicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnServicio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnServicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
