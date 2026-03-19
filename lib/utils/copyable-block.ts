/**
 * Utility functions for copyable question blocks
 * Handles text formatting and clipboard operations for exam results
 */

/**
 * Copy text to system clipboard with error handling
 * @param text Text to copy
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator?.clipboard?.writeText) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format question with alternatives for clipboard
 * Converts question + alternatives into readable text format
 * @param question Object with question_text and alternatives
 * @returns Formatted text ready for clipboard
 */
export function formatQuestionForClipboard(question: {
  question_text: string;
  alternatives: Record<string, string> | null;
}): string {
  const { question_text, alternatives } = question;

  // If no alternatives (essay question), return just the question
  if (!alternatives || Object.keys(alternatives).length === 0) {
    return question_text;
  }

  // Format as multi-line with alternatives
  let formatted = question_text + '\n\n';

  // Sort alternatives by key (a, b, c, etc.)
  const sortedEntries = Object.entries(alternatives).sort(([keyA], [keyB]) =>
    keyA.localeCompare(keyB)
  );

  formatted += sortedEntries
    .map(([key, text]) => `${key}) ${text}`)
    .join('\n');

  return formatted;
}
