/**
 * Conversions between the two measurement systems.
 *
 * These lived as local constants inside the profile editor, which meant the
 * setup page — the first form a new user ever fills in — had no access to them.
 * Flipping the unit toggle there changed the label from `cm` to `inches` and
 * left the number alone, so a height entered as 175cm was submitted as 175
 * inches. Same class of bug as the toggle itself: one screen knew something the
 * other did not.
 */

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462262;

/** Values are shown to one decimal; more precision than that is noise here. */
const round = (n: number) => Number(n.toFixed(1));

export function inchesToCm(inches: number): number {
  return round(inches * CM_PER_INCH);
}

export function cmToInches(cm: number): number {
  return round(cm / CM_PER_INCH);
}

export function lbToKg(lb: number): number {
  return round(lb / LB_PER_KG);
}

export function kgToLb(kg: number): number {
  return round(kg * LB_PER_KG);
}

/**
 * Reinterprets a form field when the unit system flips, so the value keeps its
 * real-world meaning rather than its digits.
 *
 * Takes and returns strings because that is what the controlled inputs hold;
 * blank or half-typed values pass through untouched so the field does not fight
 * someone mid-keystroke.
 */
export function convertLengthField(value: string, toMetric: boolean): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return String(toMetric ? inchesToCm(num) : cmToInches(num));
}

export function convertMassField(value: string, toMetric: boolean): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return String(toMetric ? lbToKg(num) : kgToLb(num));
}
