/**
 * Utility functions for university and faculty translations
 */

/**
 * Converts a university or faculty name to its translation key
 * Example: "University of Lleida" -> "UNIVERSITY_OF_LLEIDA"
 * Example: "Faculty of Law, Economics and Tourism" -> "FACULTY_OF_LAW_ECONOMICS_AND_TOURISM"
 */
export function getTranslationKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/,/g, '')
    .replace(/\./g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Gets the full translation path for a university
 * Example: "University of Lleida" -> "UNIVERSITY.UNIVERSITIES.UNIVERSITY_OF_LLEIDA"
 */
export function getUniversityTranslationPath(universityName: string): string {
  const key: string = getTranslationKey(universityName);
  return `UNIVERSITY.UNIVERSITIES.${key}`;
}

/**
 * Gets the full translation path for a faculty
 * Example: "Faculty of Arts" -> "UNIVERSITY.FACULTIES.FACULTY_OF_ARTS"
 */
export function getFacultyTranslationPath(facultyName: string): string {
  const key: string = getTranslationKey(facultyName);
  return `UNIVERSITY.FACULTIES.${key}`;
}

