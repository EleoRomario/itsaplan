import { transliterate } from '@/utils/transliterate';

export const COMPANY_CODE_MAX_LENGTH = 10;

const LEGAL_SUFFIXES = new Set([
  'SAC',
  'SA',
  'SRL',
  'EIRL',
  'SAA',
  'SC',
  'SNC',
  'LTDA',
  'INC',
  'LLC',
  'CORP',
  'CIA',
  'SOCIEDAD',
  'ANONIMA',
  'CERRADA',
  'ABIERTA',
  'LIMITADA',
]);

const STOP_WORDS = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'EL',
  'LOS',
  'Y',
  'E',
  'EN',
  'PARA',
  'POR',
  'CON',
  'A',
  'AL',
  'THE',
  'OF',
  'AND',
]);

const GENERIC_PREFIXES = new Set([
  'COLEGIO',
  'EMPRESA',
  'INVERSIONES',
  'CORPORACION',
  'GRUPO',
  'CONSORCIO',
  'SERVICIOS',
  'INSTITUTO',
  'HOTEL',
  'CLINICA',
  'HOSPITAL',
  'CONSTRUCTORA',
  'CONSULTORA',
  'COMERCIAL',
  'DISTRIBUIDORA',
  'TRANSPORTES',
  'RESTAURANTE',
  'FUNDACION',
  'ASOCIACION',
  'COOPERATIVA',
  'UNIVERSIDAD',
  'CENTRO',
]);

export function normalizeCompanyCode(input: string): string {
  return transliterate(input)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^\d+/, '')
    .slice(0, COMPANY_CODE_MAX_LENGTH);
}

export function suggestCompanyCode(name: string, tradeName?: string | null): string {
  const source = tradeName?.trim() || name.trim();
  if (!source) return '';

  const rawWords = transliterate(source)
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  while (rawWords.length > 1 && LEGAL_SUFFIXES.has(rawWords[rawWords.length - 1]!)) {
    rawWords.pop();
  }

  const words = rawWords.filter((w) => !STOP_WORDS.has(w));
  const list = words.length > 0 ? words : rawWords;
  if (list.length === 0) return '';

  let raw: string;
  if (list.length === 1) {
    raw = list[0]!.slice(0, 6);
  } else if (list.length === 2) {
    raw = GENERIC_PREFIXES.has(list[0]!)
      ? list[1]!.slice(0, 6)
      : `${list[0]!.slice(0, 3)}${list[1]!.slice(0, 3)}`;
  } else {
    raw = list
      .map((w) => w[0])
      .join('')
      .slice(0, 6);
  }

  return normalizeCompanyCode(raw);
}
