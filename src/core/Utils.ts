import escapeStr from "validator/lib/escape";

interface ReplaceWhiteSpaceOnceOpt {
  escape?: boolean;
  trim?: boolean;
}

/**
 * Replace a the first encountered whitespace with a dahs (-) and remove all subsequent whitespaces.
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
