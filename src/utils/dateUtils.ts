// Custom date utils for the app because JavaScript Date is a pain in the ass

/**
 * Parses a YYYY-MM-DD string into a Date object representing midnight UTC for that date.
 * This avoids timezone ambiguity during parsing and storage.
 * Example: '2024-04-01' -> Date object for 2024-04-01T00:00:00Z
 */
export const parseDateStringToUTC = (
  dateString?: string | null,
): Date | undefined => {
  if (!dateString) return undefined;
  try {
    // Ensure the string is in the correct format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn(
        `Invalid date string format passed to parseDateStringToUTC: ${dateString}`,
      );
      return undefined;
    }
    const [year, month, day] = dateString.split('-').map(Number);
    // Month is 0-indexed in JavaScript Date
    return new Date(Date.UTC(year, month - 1, day));
  } catch (error) {
    console.error(`Error parsing date string ${dateString} to UTC:`, error);
    return undefined;
  }
};

/**
 * Formats a Date object (assumed to be UTC midnight representing a local date)
 * into a YYYY-MM-DD string representing the local date.
 * Example: Date object for 2024-04-01T00:00:00Z -> '2024-04-01' (regardless of local timezone)
 */
export const formatUTCDateToLocalDateShort = (
  dateInput?: Date | string | null,
): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    // Get components based on UTC to avoid local timezone shifting the date back/forward
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth is 0-indexed
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(
      `Error formatting date ${dateInput} to local short format:`,
      error,
    );
    return '';
  }
};

/**
 * Formats a Date object (assumed to be UTC midnight representing a local date)
 * into a user-friendly string (e.g., "April 1, 2024") in the user's local timezone.
 */
export const formatUTCDateToLocalDateFriendly = (
  dateInput?: Date | string | null,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    // Get UTC components
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-indexed
    const day = date.getUTCDate();

    // Create a new Date object using these components.
    // new Date(year, month, day) constructs a date at midnight *in the local timezone*.
    const localDate = new Date(year, month, day);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      // Explicitly set timeZone to UTC ONLY if you want to display the UTC date,
      // otherwise, leave it undefined to use the browser's local timezone.
      // timeZone: 'UTC'
    };

    return localDate.toLocaleDateString(undefined, {
      ...defaultOptions,
      ...options,
    });
  } catch (error) {
    console.error(
      `Error formatting date ${dateInput} to local friendly format:`,
      error,
    );
    return 'Invalid Date';
  }
};
