// TODO: turn this into a npm package, see "url_trace.js" in @jsenv/core
// maybe we could keep it inside @jsenv/core to avoid creating yet an other GitHub repository
// and just reuse the package there
// Or this package could be moved entirely to @jsenv/core codebase into packages/importmap-node-module
// because they are very dependent from each other (both needs to parse js and HTML for example)

// https://github.com/postcss/postcss/blob/fd30d3df5abc0954a0ec642a3cdc644ab2aacf9c/lib/css-syntax-error.js#L43
// https://github.com/postcss/postcss/blob/fd30d3df5abc0954a0ec642a3cdc644ab2aacf9c/lib/terminal-highlight.js#L50
// https://github.com/babel/babel/blob/eea156b2cb8deecfcf82d52aa1b71ba4995c7d68/packages/babel-code-frame/src/index.js#L1

export const showSource = ({ url, line, column, source }) => {
  let message = "";

  message += typeof url === "undefined" ? "Anonymous" : url;
  if (typeof line !== "number") {
    return message;
  }

  message += `:${line}`;
  if (typeof column === "number") {
    message += `:${column}`;
  }

  if (!source) {
    return message;
  }

  return `${message}
${showSourceLocation(source, {
  line,
  column,
})}`;
};

const red = "\x1b[31m";
const grey = "\x1b[39m";
const ansiResetSequence = "\x1b[0m";

const showSourceLocation = (
  source,
  {
    line,
    column,
    numberOfSurroundingLinesToShow = 1,
    lineMaxLength = 120,
    color = false,
    markColor = red,
    asideColor = grey,
    colorMark = (string) => `${markColor}${string}${ansiResetSequence}`,
    colorAside = (string) => `${asideColor}${string}${ansiResetSequence}`,
  },
) => {
  const mark = color ? colorMark : (string) => string;
  const aside = color ? colorAside : (string) => string;

  const lines = source.split(/\r?\n/);
  let lineRange = {
    start: line - 1,
    end: line,
  };
  lineRange = moveLineRangeUp(lineRange, numberOfSurroundingLinesToShow);
  lineRange = moveLineRangeDown(lineRange, numberOfSurroundingLinesToShow);
  lineRange = lineRangeWithinLines(lineRange, lines);
  const linesToShow = lines.slice(lineRange.start, lineRange.end);
  const endLineNumber = lineRange.end;
  const lineNumberMaxWidth = String(endLineNumber).length;

  const columnRange = {};
  if (column === undefined) {
    columnRange.start = 0;
    columnRange.end = lineMaxLength;
  } else if (column > lineMaxLength) {
    columnRange.start = column - Math.floor(lineMaxLength / 2);
    columnRange.end = column + Math.ceil(lineMaxLength / 2);
  } else {
    columnRange.start = 0;
    columnRange.end = lineMaxLength;
  }

  return linesToShow.map((lineSource, index) => {
    const lineNumber = lineRange.start + index + 1;
    const isMainLine = lineNumber === line;
    const lineSourceTruncated = applyColumnRange(columnRange, lineSource);
    const lineNumberWidth = String(lineNumber).length;
    // ensure if line moves from 7,8,9 to 10 the display is still great
    const lineNumberRightSpacing = " ".repeat(
      lineNumberMaxWidth - lineNumberWidth,
    );
    const asideSource = `${lineNumber}${lineNumberRightSpacing} |`;
    const lineFormatted = `${aside(asideSource)} ${lineSourceTruncated}`;
    if (isMainLine) {
      if (column === undefined) {
        return `${mark(">")} ${lineFormatted}`;
      }
      const lineSourceUntilColumn = lineSourceTruncated.slice(
        0,
        column - columnRange.start,
      );
      const spacing = stringToSpaces(lineSourceUntilColumn);
      const mainLineFormatted = `${mark(">")} ${lineFormatted}
  ${" ".repeat(lineNumberWidth)} ${aside("|")}${spacing}${mark("^")}`;
      return mainLineFormatted;
    }
    return `  ${lineFormatted}`;
  }).join(`
`);
};

const applyColumnRange = ({ start, end }, line) => {
  if (typeof start !== "number") {
    throw new TypeError(`start must be a number, received ${start}`);
  }
  if (typeof end !== "number") {
    throw new TypeError(`end must be a number, received ${end}`);
  }
  if (end < start) {
    throw new Error(
      `end must be greater than start, but ${end} is smaller than ${start}`,
    );
  }

  const prefix = "…";
  const suffix = "…";
  const lastIndex = line.length;

  if (line.length === 0) {
    // don't show any ellipsis if the line is empty
    // because it's not truncated in that case
    return "";
  }

  const startTruncated = start > 0;
  const endTruncated = lastIndex > end;

  let from = startTruncated ? start + prefix.length : start;
  let to = endTruncated ? end - suffix.length : end;
  if (to > lastIndex) to = lastIndex;

  if (start >= lastIndex || from === to) {
    return "";
  }

  let result = "";
  while (from < to) {
    result += line[from];
    from++;
  }

  if (result.length === 0) {
    return "";
  }
  if (startTruncated && endTruncated) {
    return `${prefix}${result}${suffix}`;
  }
  if (startTruncated) {
    return `${prefix}${result}`;
  }
  if (endTruncated) {
    return `${result}${suffix}`;
  }
  return result;
};

const stringToSpaces = (string) => string.replace(/[^\t]/g, " ");

// const getLineRangeLength = ({ start, end }) => end - start

const moveLineRangeUp = ({ start, end }, number) => {
  return {
    start: start - number,
    end,
  };
};

const moveLineRangeDown = ({ start, end }, number) => {
  return {
    start,
    end: end + number,
  };
};

const lineRangeWithinLines = ({ start, end }, lines) => {
  return {
    start: start < 0 ? 0 : start,
    end: end > lines.length ? lines.length : end,
  };
};
