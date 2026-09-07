import { TestBed } from '@angular/core/testing';

import { Cms } from './cms';

describe('Cms', () => {
  let service: Cms;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Cms);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
