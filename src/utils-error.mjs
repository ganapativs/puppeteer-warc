// @ts-check
/**
 * Formats and logs errors in a consistent way.
 * @param {unknown} error
 * @param {string} [context]
 */
export function logError(error, context) {
  const prefix = context ? `[${context}] ` : "";
  if (error instanceof Error) {
    console.error(`${prefix}${error.name}: ${error.message}\n${error.stack}`);
  } else {
    console.error(`${prefix}Runtime error:`, error);
  }
}
