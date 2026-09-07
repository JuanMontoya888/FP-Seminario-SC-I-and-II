import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoClinica } from './histo-clinica';

describe('HistoClinica', () => {
  let component: HistoClinica;
  let fixture: ComponentFixture<HistoClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoClinica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoClinica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
