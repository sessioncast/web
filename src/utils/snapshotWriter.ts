const CLEAR_SCREEN_PREFIX = /^\x1b\[2J\x1b\[H/;

export function transformSnapshotForWrite(data: string): string {
  if (CLEAR_SCREEN_PREFIX.test(data)) {
    const content = data.replace(CLEAR_SCREEN_PREFIX, '').replace(/\r?\n$/, '');
    // Append \x1b[K (erase to end of line) before each \r\n
    // so shorter new lines clear leftover chars from longer old lines
    const cleared = content.replace(/\r\n/g, '\x1b[K\r\n');
    // \x1b[?7l disables auto-wrap to prevent long lines from causing scroll
    // \x1b[?7h re-enables it after writing
    return '\x1b[?7l\x1b[H' + cleared + '\x1b[J\x1b[?7h';
  }
  return data;
}
