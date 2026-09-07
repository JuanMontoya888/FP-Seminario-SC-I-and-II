import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioInicial } from './formulario-inicial';

describe('FormularioInicial', () => {
  let component: FormularioInicial;
  let fixture: ComponentFixture<FormularioInicial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioInicial]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioInicial);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
