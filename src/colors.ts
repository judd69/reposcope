/**
 * GitHub linguist colors for common languages. Source: github/linguist
 * `lib/linguist/languages.yml` (color field, sampled for the most common).
 */
const LINGUIST_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Shell: '#89e051',
  PowerShell: '#012456',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Lua: '#000080',
  R: '#198CE7',
  Scala: '#c22d40',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Erlang: '#B83998',
  Clojure: '#db5855',
  Zig: '#ec915c',
  Perl: '#0298c3',
  ObjectiveC: '#438eff',
  'Objective-C': '#438eff',
  JupyterNotebook: '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B',
  TeX: '#3D6117',
  VimScript: '#199f4b',
  'Vim Script': '#199f4b',
  HCL: '#844FBA',
  Nix: '#7e7eff',
  Groovy: '#4298b8',
  'PLpgSQL': '#336790',
  PLSQL: '#dad8d8',
  Solidity: '#AA6746',
  Assembly: '#6E4C13',
  Batchfile: '#C1F12E',
  Yacc: '#4B6C4B',
  CMake: '#DA3434',
  Starlark: '#76d275',
};

/** Deterministic hash for fallback hues so unknown languages are stable. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Hex color for a language: linguist color when known, otherwise a stable
 * generated hue (high saturation/lightness, readable on dark backgrounds).
 */
export function languageColor(name: string): string {
  const known = LINGUIST_COLORS[name];
  if (known) return known;
  const hue = hashString(name) % 360;
  return `hsl(${hue}, 72%, 58%)`;
}
