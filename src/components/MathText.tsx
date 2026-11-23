import React from 'react';

const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '−',
  'ˣ': 'x',
  'ⁿ': 'n',
};

function normalizeMathString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (VULGAR_FRACTIONS[ch]) {
      out += VULGAR_FRACTIONS[ch];
    } else if (SUPERSCRIPT_MAP[ch]) {
      let supRun = SUPERSCRIPT_MAP[ch];
      while (i + 1 < raw.length && SUPERSCRIPT_MAP[raw[i + 1]]) {
        i += 1;
        supRun += SUPERSCRIPT_MAP[raw[i]];
      }
      out += `^{${supRun}}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function findMatchingDelim(str: string, openIdx: number, openChar: string, closeChar: string): number {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === openChar) depth += 1;
    else if (str[i] === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function matchSimpleMathAtom(str: string, start: number, allowLeadingSign: boolean): number {
  let i = start;
  if (allowLeadingSign && (str[i] === '-' || str[i] === '−')) {
    i += 1;
  }
  if (i >= str.length) return -1;

  // Allow Δx / Δy
  if (str[i] === 'Δ' && i + 1 < str.length && /[a-zA-Z]/.test(str[i + 1])) {
    const after = i + 2;
    if (after < str.length && /[a-zA-Z]/.test(str[after])) return -1;
    return after;
  }

  // Number (with optional commas/decimal) optionally followed by a single variable letter
  const rest = str.slice(i);
  const numMatch = rest.match(/^[0-9][0-9,.]*(?:[a-zA-Z](?![a-zA-Z]))?/);
  if (numMatch) {
    return i + numMatch[0].length;
  }

  // Single variable letter with optional Unicode subscript digits (e.g. x, y₂)
  const varMatch = rest.match(/^[a-zA-Z](?![a-zA-Z])[₀₁₂₃₄₅₆₇₈₉]*/);
  if (varMatch) {
    return i + varMatch[0].length;
  }

  return -1;
}

interface FractionMatch {
  endIdx: number;
  numerator: string;
  denominator: string;
}

function tryMatchFractionAt(str: string, start: number): FractionMatch | null {
  // Never turn currency/unit rates like $45/hr into fractions
  if (start > 0 && str[start - 1] === '$') return null;
  // Never start inside the middle of a multi-letter word or digits
  if (start > 0 && /[a-zA-Z0-9.]/.test(str[start - 1])) return null;

  let numEnd = -1;
  let numContent = '';

  if (str[start] === '(') {
    const closeIdx = findMatchingDelim(str, start, '(', ')');
    if (closeIdx === -1) return null;
    numEnd = closeIdx + 1;
    numContent = str.slice(start + 1, closeIdx).trim();
  } else {
    numEnd = matchSimpleMathAtom(str, start, false);
    if (numEnd === -1) return null;
    numContent = str.slice(start, numEnd);
  }

  if (!numContent) return null;

  // Must be followed by optional spaces and '/'
  let p = numEnd;
  while (p < str.length && str[p] === ' ') p += 1;
  if (p >= str.length || str[p] !== '/') return null;
  p += 1;
  while (p < str.length && str[p] === ' ') p += 1;
  if (p >= str.length) return null;

  let denEnd = -1;
  let denContent = '';

  if (str[p] === '(') {
    const closeIdx = findMatchingDelim(str, p, '(', ')');
    if (closeIdx === -1) return null;
    denEnd = closeIdx + 1;
    denContent = str.slice(p + 1, closeIdx).trim();
  } else {
    denEnd = matchSimpleMathAtom(str, p, true);
    if (denEnd === -1) return null;
    denContent = str.slice(p, denEnd);
  }

  if (!denContent) return null;
  // Reject unit denominators like "25/min" or "$45/hr"
  if (/^[a-zA-Z]{2,}$/.test(denContent)) return null;
  // Reject if followed immediately by letters (like 1/hr or 2/sec)
  if (denEnd < str.length && /[a-zA-Z]/.test(str[denEnd])) return null;

  return {
    endIdx: denEnd,
    numerator: numContent,
    denominator: denContent,
  };
}

function renderMathNodes(normalized: string, compact: boolean, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let textBuf = '';
  let i = 0;

  const flushText = () => {
    if (textBuf.length > 0) {
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${i}`}>{textBuf}</React.Fragment>);
      textBuf = '';
    }
  };

  while (i < normalized.length) {
    // 1. Check exponent at current position
    if (normalized[i] === '^' && i + 1 < normalized.length) {
      let expContent: string | null = null;
      let nextIdx = -1;

      if (normalized[i + 1] === '{') {
        const closeBrace = findMatchingDelim(normalized, i + 1, '{', '}');
        if (closeBrace !== -1) {
          expContent = normalized.slice(i + 2, closeBrace);
          nextIdx = closeBrace + 1;
        }
      } else if (normalized[i + 1] === '(') {
        const closeParen = findMatchingDelim(normalized, i + 1, '(', ')');
        if (closeParen !== -1) {
          expContent = normalized.slice(i + 2, closeParen);
          nextIdx = closeParen + 1;
        }
      } else {
        const expMatch = normalized.slice(i + 1).match(/^[−-]?[a-zA-Z0-9]+/);
        if (expMatch) {
          expContent = expMatch[0];
          nextIdx = i + 1 + expMatch[0].length;
        }
      }

      if (expContent !== null && nextIdx !== -1) {
        flushText();
        nodes.push(
          <sup
            key={`${keyPrefix}-sup-${i}`}
            className="inline-flex items-baseline align-super text-[0.72em] leading-none mx-[0.5px] font-semibold"
          >
            {renderMathNodes(expContent, true, `${keyPrefix}-s${i}`)}
          </sup>,
        );
        i = nextIdx;
        continue;
      }
    }

    // 2. Check vertical fraction starting at current position
    const frac = tryMatchFractionAt(normalized, i);
    if (frac) {
      flushText();
      nodes.push(
        <span
          key={`${keyPrefix}-frac-${i}`}
          className={`inline-flex flex-col items-center justify-center align-middle leading-none ${
            compact ? 'mx-0.5 text-[0.86em]' : 'mx-1 text-[0.88em]'
          }`}
        >
          <span
            className={`${
              compact ? 'px-0.5 pb-[1px]' : 'px-1 pb-[2px]'
            } border-b border-current text-center`}
          >
            {renderMathNodes(frac.numerator, true, `${keyPrefix}-n${i}`)}
          </span>
          <span className={`${compact ? 'px-0.5 pt-[1px]' : 'px-1 pt-[2px]'} text-center`}>
            {renderMathNodes(frac.denominator, true, `${keyPrefix}-d${i}`)}
          </span>
        </span>,
      );
      i = frac.endIdx;
      continue;
    }

    textBuf += normalized[i];
    i += 1;
  }

  flushText();
  return nodes;
}

export const MathText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const normalized = normalizeMathString(text);
  const content = renderMathNodes(normalized, false, 'm');
  if (className) {
    return <span className={className}>{content}</span>;
  }
  return <>{content}</>;
};
