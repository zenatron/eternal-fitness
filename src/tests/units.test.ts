import { describe, expect, it } from 'bun:test';
import { convertLengthField, convertMassField } from '@/utils/units';

/**
 * The profile editor and the setup form both flip units mid-form. The setup form
 * previously changed only the label, submitting 175cm as 175 inches.
 */

describe('convertLengthField', () => {
  it('converts inches to centimetres', () => {
    expect(convertLengthField('69', true)).toBe('175.3');
  });

  it('converts centimetres to inches', () => {
    expect(convertLengthField('175', false)).toBe('68.9');
  });

  it('round-trips within display precision', () => {
    const metric = convertLengthField('70', true);
    expect(parseFloat(convertLengthField(metric, false))).toBeCloseTo(70, 1);
  });

  it('leaves blank and half-typed values alone', () => {
    expect(convertLengthField('', true)).toBe('');
    expect(convertLengthField('.', true)).toBe('.');
  });
});

describe('convertMassField', () => {
  it('converts pounds to kilograms', () => {
    expect(convertMassField('154', true)).toBe('69.9');
  });

  it('converts kilograms to pounds', () => {
    expect(convertMassField('70', false)).toBe('154.3');
  });

  it('round-trips within display precision', () => {
    const imperial = convertMassField('82.5', false);
    expect(parseFloat(convertMassField(imperial, true))).toBeCloseTo(82.5, 1);
  });

  it('leaves blank values alone', () => {
    expect(convertMassField('', false)).toBe('');
  });
});
