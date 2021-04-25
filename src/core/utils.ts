import escapeStr from "validator/lib/escape";

interface ReplaceWhiteSpaceOnceOpt {
  escape?: boolean;
  trim?: boolean;
}

/**
 * Replace the first encountered whitespace with a dahs (-) and remove all subsequent whitespaces.
 * @param str the string to process
 * @param options whether to trim and/or escape the string before processing
 * @returns a string with only the first whitespace replaced and all subsequent others removed
 */
export function replaceWhiteSpaceOnce(
  str: string,
  options: ReplaceWhiteSpaceOnceOpt
): string {
  if (!str) return "";
  const { trim, escape } = options;
  if (trim) str = str.trim();
  if (escape) str = escapeStr(str);

  let found = false;
  let resultStr = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (!found && " " === char) {
      resultStr = resultStr + "-";
      found = true;
    } else if (found && char === " ") {
      continue;
    } else {
      resultStr = resultStr + char;
    }
  }
  return resultStr;
}
/**
 * Generates a random number between min and max or between 0 and min if max is not provided
 * @param min the minimun number possible
 * @param max the maximum number possible
 */
export function randomNumber(min: number, max?: number): number {
  if (!max) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}
