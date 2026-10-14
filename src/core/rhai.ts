// Translates Forge's Rhai gameplay scripts into JavaScript so projects made on the desktop
// editor run unchanged on the phone. Handles the subset Forge uses: `fn`, `let`/`const`,
// `if cond {`, `else if`, `while cond {`, `loop {`, `for i in a..b {`, `for x in arr {`,
// method calls on numbers (`(t * 3.0).sin()`), `.len()`, string concatenation.
// Plain JavaScript scripts (containing `function`) pass through untouched.

const KEYWORDS_WITH_COND = ['if', 'while'];

function isIdent(c: string) {
  return /[A-Za-z0-9_$]/.test(c);
}

/** Find the index of the `{` that opens the block after a condition starting at `from`. */
function findBlockBrace(src: string, from: number): number {
  let depth = 0;
  let str: string | null = null;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (str) {
      if (c === '\\') i++;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') str = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === '{' && depth === 0) {
      // `#{` is a Rhai object-map literal, not a block.
      if (src[i - 1] === '#') continue;
      return i;
    } else if (c === ';' && depth === 0) return -1;
  }
  return -1;
}

export function rhaiToJs(src: string): string {
  if (/\bfunction\s+(start|update)\s*\(/.test(src)) return src;
  let out = '';
  let i = 0;
  let str: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (str) {
      out += c;
      if (c === '\\' && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === str) str = null;
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === '#' && src[i + 1] === '{') {
      // object map literal #{a: 1} → {a: 1}
      i++;
      continue;
    }
    const prevIdent = i > 0 && isIdent(src[i - 1]);
    if (!prevIdent && isIdent(c)) {
      let j = i;
      while (j < src.length && isIdent(src[j])) j++;
      const word = src.slice(i, j);
      const prevDot = out.trimEnd().endsWith('.');
      if (!prevDot) {
        if (word === 'fn') {
          out += 'function';
          i = j;
          continue;
        }
        if (KEYWORDS_WITH_COND.includes(word)) {
          const brace = findBlockBrace(src, j);
          if (brace > 0) {
            const cond = src.slice(j, brace).trim();
            if (cond.startsWith('(') && matchingParen(cond) === cond.length - 1) {
              out += `${word} ${rhaiToJsExpr(cond)} `;
            } else {
              out += `${word} (${rhaiToJsExpr(cond)}) `;
            }
            i = brace;
            continue;
          }
        }
        if (word === 'loop') {
          const rest = src.slice(j).trimStart();
          if (rest.startsWith('{')) {
            out += 'while (true)';
            i = j;
            continue;
          }
        }
        if (word === 'for') {
          const brace = findBlockBrace(src, j);
          if (brace > 0) {
            const head = src.slice(j, brace).trim();
            const m = /^\(?\s*([A-Za-z_]\w*)\s+in\s+(.+?)\s*\)?$/.exec(head);
            if (m) {
              const [, v, iter] = m;
              const range = /^(.+?)\.\.(=?)(.+)$/.exec(iter);
              if (range) {
                const [, a, incl, b] = range;
                out += `for (let ${v} = ${rhaiToJsExpr(a)}; ${v} ${incl ? '<=' : '<'} ${rhaiToJsExpr(b)}; ${v}++) `;
              } else {
                out += `for (const ${v} of ${rhaiToJsExpr(iter)}) `;
              }
              i = brace;
              continue;
            }
          }
        }
      }
      out += word;
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function matchingParen(s: string): number {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') d++;
    else if (s[i] === ')') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

/** Expressions only need the `#{}` map literal fix (everything else is shared syntax). */
function rhaiToJsExpr(e: string): string {
  return e.replace(/#\{/g, '{');
}

let installed = false;

/** Rhai-style methods on numbers, strings and arrays (`x.sin()`, `s.len()`…). */
export function installRhaiPrelude() {
  if (installed) return;
  installed = true;
  const def = (proto: any, name: string, fn: (...a: any[]) => any) => {
    if (!(name in proto)) Object.defineProperty(proto, name, { value: fn, configurable: true, writable: true });
  };
  const N = Number.prototype as any;
  for (const f of ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'exp', 'sign'] as const) {
    def(N, f, function (this: number) {
      return (Math as any)[f](this);
    });
  }
  def(N, 'ln', function (this: number) {
    return Math.log(this);
  });
  def(N, 'log', function (this: number) {
    return Math.log10(this);
  });
  def(N, 'min', function (this: number, o: number) {
    return Math.min(this, o);
  });
  def(N, 'max', function (this: number, o: number) {
    return Math.max(this, o);
  });
  def(N, 'pow', function (this: number, o: number) {
    return Math.pow(this, o);
  });
  def(N, 'clamp', function (this: number, a: number, b: number) {
    return Math.min(Math.max(this, a), b);
  });
  def(N, 'to_int', function (this: number) {
    return Math.trunc(this);
  });
  def(N, 'to_float', function (this: number) {
    return this;
  });
  def(N, 'to_string', function (this: number) {
    return String(this);
  });
  def(N, 'atan2', function (this: number, x: number) {
    return Math.atan2(this, x);
  });
  def(N, 'fract', function (this: number) {
    return this - Math.floor(this);
  });
  const S = String.prototype as any;
  def(S, 'len', function (this: string) {
    return this.length;
  });
  def(S, 'contains', function (this: string, s: string) {
    return this.includes(s);
  });
  def(S, 'to_upper', function (this: string) {
    return this.toUpperCase();
  });
  def(S, 'to_lower', function (this: string) {
    return this.toLowerCase();
  });
  def(S, 'to_string', function (this: string) {
    return String(this);
  });
  def(S, 'is_empty', function (this: string) {
    return this.length === 0;
  });
  const A = Array.prototype as any;
  def(A, 'len', function (this: unknown[]) {
    return this.length;
  });
  def(A, 'contains', function (this: unknown[], v: unknown) {
    return this.includes(v);
  });
  def(A, 'is_empty', function (this: unknown[]) {
    return this.length === 0;
  });
  def(A, 'remove', function (this: unknown[], i: number) {
    return this.splice(i, 1)[0];
  });
  def(A, 'clear', function (this: unknown[]) {
    this.length = 0;
  });
}

export interface CompiledScript {
  start?: (this: any) => void;
  update?: (this: any, dt: number) => void;
}

/** Compile a script with the given API functions in scope. Throws on syntax errors. */
export function compileScript(src: string, api: Record<string, unknown>): CompiledScript {
  installRhaiPrelude();
  const js = rhaiToJs(src);
  const names = Object.keys(api);
  const body = `"use strict";\n${js}\n;return { start: typeof start === "function" ? start : undefined, update: typeof update === "function" ? update : undefined };`;
  // eslint-disable-next-line no-new-func
  const factory = new Function(...names, body);
  return factory(...names.map((n) => api[n]));
}

/** Syntax check used by the agent's set_script tool. */
export function checkScript(src: string): string | null {
  try {
    installRhaiPrelude();
    // eslint-disable-next-line no-new-func
    new Function(`"use strict";\n${rhaiToJs(src)}`);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
