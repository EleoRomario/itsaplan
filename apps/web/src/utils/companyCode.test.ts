import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeCompanyCode, suggestCompanyCode } from './companyCode';

describe('companyCode', () => {
  it('builds initials for long Spanish legal names without stop-words', () => {
    assert.equal(
      suggestCompanyCode('ASOCIACION CIVIL DE INVESTIGACION PARA EL DESARROLLO Y LA EMPRESA'),
      'ACIDE',
    );
  });

  it('drops legal suffixes and generic prefixes for 2-word names', () => {
    assert.equal(suggestCompanyCode('COLEGIO COLVER S.A.C.'), 'COLVER');
    assert.equal(suggestCompanyCode('COLEGIO CLAVER S.A.C.'), 'CLAVER');
  });

  it('combines two specific words into a 6-letter code', () => {
    assert.equal(suggestCompanyCode('TURISMO EMPRENDE S.A.C.'), 'TUREMP');
  });

  it('prefers tradeName over legal name when present', () => {
    assert.equal(
      suggestCompanyCode(
        'ASOCIACION CIVIL DE INVESTIGACION PARA EL DESARROLLO Y LA EMPRESA',
        'Colver',
      ),
      'COLVER',
    );
  });

  it('normalizes manual codes to uppercase alphanumeric starting with a letter', () => {
    assert.equal(normalizeCompanyCode('123 clv-01'), 'CLV01');
  });
});
