export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // Welcome Modal
    welcomeTitle: 'SessionCast에 오신 것을 환영합니다!',
    welcomeSubtitle: '터미널 세션을 실시간으로 공유하고 협업하세요',
    welcomeConnect: '내 터미널 연결하기',
    welcomeDemo: '데모 세션 보기',
    welcomeTour: '사용 시나리오 보기',
    welcomeSkip: '나중에 하기',
    welcomeBack: '뒤로',

    // Scenarios
    scenarioTitle: '어떻게 사용하실 건가요?',
    scenarioSubtitle: '사용 목적에 맞는 가이드를 제공해 드릴게요',
    scenarioTeam: '팀원에게 공유',
    scenarioTeamDesc: '작업 화면을 실시간으로 공유',
    scenarioCicd: 'CI/CD 모니터링',
    scenarioCicdDesc: '빌드/배포 로그 실시간 확인',
    scenarioStreaming: '라이브 코딩',
    scenarioStreamingDesc: '코딩 과정을 스트리밍',
    scenarioDebug: '원격 디버깅',
    scenarioDebugDesc: '서버 문제 원격 해결',

    // Demo
    demoTitle: '데모 세션',
    demoHint: '이렇게 터미널이 실시간으로 스트리밍됩니다!',
    demoStart: '내 터미널도 연결하기',

    // Onboarding
    welcome: 'SessionCast에 오신 것을 환영합니다',
    noMachines: '아직 연결된 머신이 없습니다. 아래 단계를 따라 시작하세요.',

    // Setup steps
    step1Title: 'Host Agent 설치',
    step1Desc: '제어하려는 머신에서 agent를 클론하고 빌드하세요:',

    step2Title: '설정 파일 생성',
    step2Desc: '아래 내용으로 설정 파일을 생성하세요:',
    yourAgentToken: 'Agent 토큰:',
    copyToken: '토큰 복사',
    copy: '복사',
    copied: '복사됨!',

    step3Title: 'tmux 세션 생성',
    step3Desc: '최소 하나의 tmux 세션이 실행 중이어야 합니다:',

    step4Title: 'Agent 실행',
    step4Desc: 'Agent를 실행하여 머신을 연결하세요:',
    step4Hint: 'Agent가 자동으로 모든 tmux 세션을 감지합니다.',

    // Footer
    footerConnected: '연결되면 사이드바에 세션이 표시됩니다.',
    footerSecurity: '본인 토큰으로 등록된 세션만 볼 수 있습니다.',

    // Session list
    sessions: '세션',
    noSessions: '세션 없음',

    // Token manager
    agentTokens: 'Agent 토큰',
    tokenDescription: 'Agent 토큰을 생성하여 ~/.tmux-remote.yml 설정에 추가하세요. 본인 토큰으로 등록된 세션만 볼 수 있습니다.',
    generateNewToken: '새 토큰 생성',
    generating: '생성 중...',
    yourTokens: '내 토큰',
    noTokensYet: '토큰이 없습니다. 새로 생성하세요.',
    newTokenWarning: '새 토큰 (지금 복사하세요, 다시 표시되지 않습니다):',
    revoke: '폐기',
    configExample: '설정 예시',
    tokenRevoked: '토큰이 폐기되었습니다',
    tokenNotFound: '토큰을 찾을 수 없거나 소유하지 않습니다',

    // Login
    loginTitle: 'SessionCast',
    loginSubtitle: '어디서나 터미널에 접속하세요',
    loginWithGoogle: 'Google로 로그인',
    domainNotAllowed: '허용되지 않은 도메인입니다',
    loginFailed: '로그인 실패. 다시 시도해주세요.',

    // Terminal
    selectSession: '사이드바에서 세션을 선택하세요',
    offline: '오프라인',
    connecting: '연결 중...',

    // General
    loading: '로딩 중...',
    error: '오류',
    close: '닫기',
  },

  en: {
    // Welcome Modal
    welcomeTitle: 'Welcome to SessionCast!',
    welcomeSubtitle: 'Share and collaborate on terminal sessions in real-time',
    welcomeConnect: 'Connect My Terminal',
    welcomeDemo: 'View Demo Session',
    welcomeTour: 'Browse Use Cases',
    welcomeSkip: 'Skip for now',
    welcomeBack: 'Back',

    // Scenarios
    scenarioTitle: 'How will you use SessionCast?',
    scenarioSubtitle: 'We\'ll guide you based on your use case',
    scenarioTeam: 'Share with Team',
    scenarioTeamDesc: 'Share your screen in real-time',
    scenarioCicd: 'CI/CD Monitoring',
    scenarioCicdDesc: 'Watch build/deploy logs live',
    scenarioStreaming: 'Live Coding',
    scenarioStreamingDesc: 'Stream your coding sessions',
    scenarioDebug: 'Remote Debugging',
    scenarioDebugDesc: 'Debug server issues remotely',

    // Demo
    demoTitle: 'Demo Session',
    demoHint: 'This is how terminals are streamed in real-time!',
    demoStart: 'Connect My Terminal',

    // Onboarding
    welcome: 'Welcome to SessionCast',
    noMachines: 'No connected machines yet. Follow the steps below to get started.',

    // Setup steps
    step1Title: 'Install the Host Agent',
    step1Desc: 'On the machine you want to control, clone and build the agent:',

    step2Title: 'Create Configuration File',
    step2Desc: 'Create the config file with your agent token:',
    yourAgentToken: 'Your Agent Token:',
    copyToken: 'Copy Token',
    copy: 'Copy',
    copied: 'Copied!',

    step3Title: 'Create a tmux Session',
    step3Desc: 'Make sure you have at least one tmux session running:',

    step4Title: 'Start the Agent',
    step4Desc: 'Run the agent to connect your machine:',
    step4Hint: 'The agent will automatically discover all your tmux sessions.',

    // Footer
    footerConnected: 'Once connected, your sessions will appear in the sidebar.',
    footerSecurity: 'Only sessions registered with your token will be visible to you.',

    // Session list
    sessions: 'Sessions',
    noSessions: 'No sessions',

    // Token manager
    agentTokens: 'Agent Tokens',
    tokenDescription: 'Generate an agent token and add it to your ~/.tmux-remote.yml config. Only you will be able to see sessions registered with your token.',
    generateNewToken: 'Generate New Token',
    generating: 'Generating...',
    yourTokens: 'Your Tokens',
    noTokensYet: 'No tokens yet. Generate one to get started.',
    newTokenWarning: 'New Token (copy now, won\'t be shown again):',
    revoke: 'Revoke',
    configExample: 'Config Example',
    tokenRevoked: 'Token revoked successfully',
    tokenNotFound: 'Token not found or not owned by you',

    // Login
    loginTitle: 'SessionCast',
    loginSubtitle: 'Access your terminals from anywhere',
    loginWithGoogle: 'Sign in with Google',
    domainNotAllowed: 'Domain not allowed',
    loginFailed: 'Login failed. Please try again.',

    // Terminal
    selectSession: 'Select a session from the sidebar',
    offline: 'Offline',
    connecting: 'Connecting...',

    // General
    loading: 'Loading...',
    error: 'Error',
    close: 'Close',
  }
};

export type TranslationKey = keyof typeof translations.ko;
