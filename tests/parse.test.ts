import { describe, it, expect } from 'vitest';
import { parseRepoInput, repoSlug } from '../src/parse';

describe('parseRepoInput', () => {
  it('parses a plain owner/repo', () => {
    expect(parseRepoInput('facebook/react')).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('parses a full https URL', () => {
    expect(parseRepoInput('https://github.com/facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('parses a URL with extra path segments, query and fragment', () => {
    expect(parseRepoInput('https://github.com/vuejs/core/tree/main?tab=readme#readme')).toEqual({
      owner: 'vuejs',
      repo: 'core',
    });
  });

  it('strips a trailing .git and slashes', () => {
    expect(parseRepoInput('https://github.com/judd69/reposcope.git/')).toEqual({
      owner: 'judd69',
      repo: 'reposcope',
    });
  });

  it('parses a bare host path and www variant', () => {
    expect(parseRepoInput('github.com/torvalds/linux')).toEqual({ owner: 'torvalds', repo: 'linux' });
    expect(parseRepoInput('www.github.com/microsoft/vscode')).toEqual({
      owner: 'microsoft',
      repo: 'vscode',
    });
  });

  it('accepts dashes, dots and underscores in names', () => {
    expect(parseRepoInput('my-org/my.repo_name-2')).toEqual({
      owner: 'my-org',
      repo: 'my.repo_name-2',
    });
  });

  it('rejects non-github hosts', () => {
    expect(parseRepoInput('https://gitlab.com/foo/bar')).toBeNull();
  });

  it('rejects missing repo part and empty input', () => {
    expect(parseRepoInput('facebook')).toBeNull();
    expect(parseRepoInput('')).toBeNull();
    expect(parseRepoInput('   ')).toBeNull();
  });

  it('rejects invalid characters', () => {
    expect(parseRepoInput('face book/react')).toBeNull();
    expect(parseRepoInput('facebook/re act!')).toBeNull();
  });

  it('repoSlug renders owner/repo', () => {
    expect(repoSlug({ owner: 'a', repo: 'b' })).toBe('a/b');
  });
});
