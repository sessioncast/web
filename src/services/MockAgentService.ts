type TerminalWriter = (data: string) => void;

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgBlue: '\x1b[44m',
};

// Box drawing characters
const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  dashed: '╌',
};

class MockAgentService {
  private terminalWriter: TerminalWriter | null = null;
  private commandBuffer: string = '';
  private isRunning: boolean = false;
  private inClaudeMode: boolean = false;

  attachToTerminal(writer: TerminalWriter | null): void {
    this.terminalWriter = writer;
    this.commandBuffer = '';
    this.inClaudeMode = false;
  }

  detach(): void {
    this.terminalWriter = null;
    this.commandBuffer = '';
    this.isRunning = false;
    this.inClaudeMode = false;
  }

  private write(text: string): void {
    if (this.terminalWriter) {
      this.terminalWriter(text);
    }
  }

  private async typeText(text: string, charDelay: number = 35): Promise<void> {
    for (const char of text) {
      this.write(char);
      await this.delay(charDelay);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private showPrompt(): void {
    this.write(`${C.green}user@macbook${C.reset}:${C.blue}~/projects${C.reset}$ `);
  }

  private showClaudePrompt(): void {
    // Real Claude Code uses ❯ character
    this.write(`${C.brightMagenta}❯${C.reset} `);
  }

  handleInput(data: string): void {
    if (!this.terminalWriter || this.isRunning) return;

    for (const char of data) {
      const code = char.charCodeAt(0);

      if (code === 13) {
        this.write('\r\n');
        if (this.inClaudeMode) {
          this.handleClaudeInput(this.commandBuffer.trim());
        } else {
          this.executeCommand(this.commandBuffer.trim());
        }
        this.commandBuffer = '';
        return;
      }

      if (code === 127 || code === 8) {
        if (this.commandBuffer.length > 0) {
          this.commandBuffer = this.commandBuffer.slice(0, -1);
          this.write('\b \b');
        }
        return;
      }

      if (code === 3) {
        this.write('^C\r\n');
        this.commandBuffer = '';
        this.inClaudeMode = false;
        this.showPrompt();
        return;
      }

      if (code >= 32 && code <= 126) {
        this.commandBuffer += char;
        this.write(char);
      }
    }
  }

  private executeCommand(command: string): void {
    if (!command) {
      this.showPrompt();
      return;
    }

    if (command === 'claude') {
      this.startClaudeMode();
      return;
    }

    const commands: Record<string, string> = {
      'ls': `${C.blue}src${C.reset}  ${C.blue}tests${C.reset}  package.json  README.md  ${C.green}hello.py${C.reset}\r\n`,
      'cat hello.py': `${C.brightCyan}print${C.reset}(${C.yellow}"Hello, World!"${C.reset})\r\n`,
      'python hello.py': `Hello, World!\r\n`,
      'python3 hello.py': `Hello, World!\r\n`,
      'pwd': '/Users/user/projects\r\n',
      'clear': '\x1b[2J\x1b[H',
    };

    if (commands[command]) {
      this.write(commands[command]);
    } else {
      this.write(`${C.dim}Command not found. Try 'claude' to start Claude Code!${C.reset}\r\n`);
    }
    this.showPrompt();
  }

  private async startClaudeMode(): Promise<void> {
    this.isRunning = true;

    // Clear and draw Claude Code header box (like real Claude Code)
    this.write('\r\n');

    const width = 78;
    const titleLine = `${BOX.topLeft}${BOX.horizontal}${BOX.horizontal}${BOX.horizontal} ${C.bold}Claude Code${C.reset} ${C.dim}v2.1.29${C.reset} `;
    const remainingWidth = width - 18;

    // Top border with title
    this.write(titleLine);
    this.write(BOX.horizontal.repeat(remainingWidth) + BOX.topRight + '\r\n');

    // Empty line
    this.write(BOX.vertical + ' '.repeat(width) + BOX.vertical + '\r\n');

    // Welcome message
    const welcomeMsg = 'Welcome to SessionCast Demo!';
    const welcomePadding = Math.floor((width - welcomeMsg.length) / 2);
    this.write(BOX.vertical + ' '.repeat(welcomePadding) + welcomeMsg + ' '.repeat(width - welcomePadding - welcomeMsg.length) + BOX.vertical + '\r\n');

    // Empty line
    this.write(BOX.vertical + ' '.repeat(width) + BOX.vertical + '\r\n');

    // Logo - fire/flame shape like real Claude Code
    const logo1 = '▐▛███▜▌';
    const logo2 = '▝▜█████▛▘';
    const logo3 = '▘▘ ▝▝';
    const logoPad1 = Math.floor((width - logo1.length) / 2);
    const logoPad2 = Math.floor((width - logo2.length) / 2);
    const logoPad3 = Math.floor((width - logo3.length) / 2);

    this.write(BOX.vertical + ' '.repeat(logoPad1) + `${C.brightRed}${logo1}${C.reset}` + ' '.repeat(width - logoPad1 - logo1.length) + BOX.vertical + '\r\n');
    this.write(BOX.vertical + ' '.repeat(logoPad2) + `${C.brightRed}${logo2}${C.reset}` + ' '.repeat(width - logoPad2 - logo2.length) + BOX.vertical + '\r\n');
    this.write(BOX.vertical + ' '.repeat(logoPad3) + `${C.brightRed}${logo3}${C.reset}` + ' '.repeat(width - logoPad3 - logo3.length) + BOX.vertical + '\r\n');

    // Model info
    const modelInfo = 'Opus 4.5 · Claude Max';
    const modelPad = Math.floor((width - modelInfo.length) / 2);
    this.write(BOX.vertical + ' '.repeat(modelPad) + `${C.dim}${modelInfo}${C.reset}` + ' '.repeat(width - modelPad - modelInfo.length) + BOX.vertical + '\r\n');

    // Working directory
    const workDir = '~/projects';
    const workPad = Math.floor((width - workDir.length) / 2);
    this.write(BOX.vertical + ' '.repeat(workPad) + `${C.cyan}${workDir}${C.reset}` + ' '.repeat(width - workPad - workDir.length) + BOX.vertical + '\r\n');

    // Bottom border
    this.write(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight + '\r\n');

    await this.delay(200);

    // Separator and tip
    this.write('\r\n' + BOX.horizontal.repeat(80) + '\r\n');
    this.write(`${C.brightMagenta}❯${C.reset} ${C.dim}Try "create a hello world file"${C.reset}\r\n`);
    this.write(BOX.horizontal.repeat(80) + '\r\n');
    this.write(`  ${C.dim}? for shortcuts${C.reset}` + ' '.repeat(50) + `${C.dim}0 tokens${C.reset}\r\n`);

    this.inClaudeMode = true;
    this.isRunning = false;
    this.showClaudePrompt();
  }

  private async handleClaudeInput(input: string): Promise<void> {
    if (!input) {
      this.showClaudePrompt();
      return;
    }

    if (input === '/exit' || input === 'exit' || input === 'quit') {
      this.write(`\r\n${C.dim}Goodbye!${C.reset}\r\n\r\n`);
      this.inClaudeMode = false;
      this.showPrompt();
      return;
    }

    this.isRunning = true;
    await this.simulateClaudeResponse(input);
    this.isRunning = false;
    this.showClaudePrompt();
  }

  private async simulateClaudeResponse(input: string): Promise<void> {
    this.write('\r\n');

    // Show thinking with the real ∴ symbol
    const thinkingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    for (let i = 0; i < 10; i++) {
      this.write(`\r${C.dim}∴${C.reset} ${C.dim}Thinking${thinkingFrames[i % thinkingFrames.length]}${C.reset}  `);
      await this.delay(100);
    }
    this.write('\r\x1b[2K'); // Clear line

    // Show thinking text (like real Claude Code)
    this.write(`${C.dim}∴ Thinking…${C.reset}\r\n\r\n`);
    await this.delay(200);

    const thinkingText = '  The user wants me to create a simple "Hello World" Python file.';
    this.write(`${C.dim}${thinkingText}${C.reset}\r\n\r\n`);
    await this.delay(300);

    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('hello') || lowerInput.includes('create') || lowerInput.includes('make') || lowerInput.includes('write')) {
      await this.createHelloWorld();
    } else {
      await this.respondGeneric();
    }

    // Show separator and status
    this.write('\r\n' + BOX.horizontal.repeat(80) + '\r\n');
    this.write(`  ${C.dim}? for shortcuts${C.reset}` + ' '.repeat(45) + `${C.dim}1024 tokens${C.reset}\r\n`);
  }

  private async createHelloWorld(): Promise<void> {
    // Tool call indicator (like real Claude Code)
    this.write(`${C.magenta}⏺${C.reset} ${C.bold}Write${C.reset}(${C.cyan}/Users/user/projects/hello.py${C.reset})\r\n\r\n`);
    await this.delay(300);

    // File creation box with dashed borders
    this.write(BOX.horizontal.repeat(80) + '\r\n');
    this.write(` ${C.bold}Create file${C.reset}\r\n`);
    this.write(` ${C.cyan}hello.py${C.reset}\r\n`);
    this.write(BOX.dashed.repeat(80) + '\r\n');

    // Code content with syntax highlighting
    this.write(` ${C.brightCyan}print${C.reset}(${C.yellow}"Hello, World!"${C.reset})\r\n`);

    this.write(BOX.dashed.repeat(80) + '\r\n');
    await this.delay(500);

    // Tool result (like real Claude Code)
    this.write(`  ${C.dim}⎿${C.reset}  ${C.green}Wrote 1 line to /Users/user/projects/hello.py${C.reset}\r\n\r\n`);
    await this.delay(300);

    // Claude's response
    this.write(`${C.magenta}⏺${C.reset} Created ${C.cyan}hello.py${C.reset} with a simple "Hello, World!" program.\r\n`);
    this.write(`  You can run it with:\r\n\r\n`);
    this.write(`  ${C.bgBlue}${C.white} python hello.py ${C.reset}\r\n`);
  }

  private async respondGeneric(): Promise<void> {
    this.write(`${C.magenta}⏺${C.reset} I can help you with coding tasks! Try asking me to:\r\n\r\n`);
    this.write(`  ${C.dim}•${C.reset} Create a hello world program\r\n`);
    this.write(`  ${C.dim}•${C.reset} Write a Python script\r\n`);
    this.write(`  ${C.dim}•${C.reset} Explain how a file works\r\n`);
  }

  async runDemoScenario(_scenario: 'welcome' | 'claude' | 'neofetch' | 'help'): Promise<void> {
    if (this.isRunning || !this.terminalWriter) return;
    this.isRunning = true;

    try {
      await this.runClaudeCodeDemo();
    } finally {
      this.isRunning = false;
    }
  }

  private async runClaudeCodeDemo(): Promise<void> {
    // Clear screen
    this.write('\x1b[2J\x1b[H');
    await this.delay(200);

    // Step 1: Show shell prompt and type 'claude'
    this.showPrompt();
    await this.delay(300);
    await this.typeText('claude', 70);
    await this.delay(200);
    this.write('\r\n');

    // Step 2: Claude Code startup
    await this.startClaudeMode();
    await this.delay(800);

    // Step 3: Type a request
    const userRequest = 'create a hello world file';
    await this.typeText(userRequest, 50);
    await this.delay(400);
    this.write('\r\n');
    this.commandBuffer = '';

    // Step 4: Claude responds
    await this.simulateClaudeResponse(userRequest);

    this.showClaudePrompt();
  }

  async simulateOutput(text: string, delayMs: number = 0): Promise<void> {
    if (delayMs > 0) {
      await this.delay(delayMs);
    }
    this.write(text);
  }
}

export const mockAgentService = new MockAgentService();
