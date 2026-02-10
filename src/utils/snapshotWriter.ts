const CLEAR_SCREEN_PREFIX = /^\x1b\[2J\x1b\[H/;

export function transformSnapshotForWrite(data: string): string {
  if (CLEAR_SCREEN_PREFIX.test(data)) {
    // Strip the clear-screen prefix and trailing \r\n to prevent
    // the last newline from scrolling the first line into scrollback
    const content = data.replace(CLEAR_SCREEN_PREFIX, '').replace(/\r?\n$/, '');
    return '\x1b[H' + content + '\x1b[J';
  }
  return data;
}
