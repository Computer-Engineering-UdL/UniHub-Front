/**
 * Utility functions for interest translations
 */

/**
 * Converts an interest name to its translation key
 * Example: "AI & ML" -> "AI_&_ML"
 * Example: "Computer science" -> "COMPUTER_SCIENCE"
 */
export function getInterestTranslationKey(interestName: string): string {
  return interestName.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Gets the full translation path for an interest
 * Example: "AI & ML" -> "PROFILE.INTERESTS.ITEMS.AI_&_ML"
 */
export function getInterestTranslationPath(interestName: string): string {
  const key = getInterestTranslationKey(interestName);
  return `PROFILE.INTERESTS.ITEMS.${key}`;
}

/**
 * Gets the full translation path for a category
 * Example: "Academics & Learning" -> "PROFILE.INTERESTS.CATEGORIES.ACADEMICS_&_LEARNING"
 */
export function getCategoryTranslationPath(categoryName: string): string {
  const key = getInterestTranslationKey(categoryName);
  return `PROFILE.INTERESTS.CATEGORIES.${key}`;
}
