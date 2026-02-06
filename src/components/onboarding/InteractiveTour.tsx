import { useCallback, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS, TooltipRenderProps } from 'react-joyride';
import { useOnboardingStore } from '../../stores/OnboardingStore';
import { mockAgentService } from '../../services/MockAgentService';
import { getTerminalWriter } from '../Terminal';
import { useLanguage } from '../../i18n';
import './InteractiveTour.css';

interface InteractiveTourProps {
  onSelectDemoSession?: () => void;
}

// Custom Tooltip Component
function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  const { lang } = useLanguage();
  const progress = ((index + 1) / size) * 100;

  const stepIcons = ['👋', '📋', '🖥️', '⌨️', '🚀'];
  const currentIcon = stepIcons[index] || '✨';

  return (
    <div className="tour-tooltip" {...tooltipProps}>
      {/* Progress bar */}
      <div className="tour-progress-bar">
        <div className="tour-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="tour-header">
        <span className="tour-icon">{currentIcon}</span>
        <span className="tour-step-count">
          {index + 1} / {size}
        </span>
      </div>

      {/* Content */}
      <div className="tour-content">
        {step.content}
      </div>

      {/* Actions */}
      <div className="tour-actions">
        <button className="tour-btn tour-btn-skip" {...skipProps}>
          {lang === 'ko' ? '건너뛰기' : 'Skip'}
        </button>
        <div className="tour-btn-group">
          {index > 0 && (
            <button className="tour-btn tour-btn-back" {...backProps}>
              {lang === 'ko' ? '이전' : 'Back'}
            </button>
          )}
          {continuous && (
            <button className="tour-btn tour-btn-primary" {...primaryProps}>
              {isLastStep
                ? (lang === 'ko' ? '시작하기' : 'Get Started')
                : (lang === 'ko' ? '다음' : 'Next')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InteractiveTour({ onSelectDemoSession }: InteractiveTourProps) {
  const { lang } = useLanguage();
  const {
    isTourActive,
    tourStepIndex,
    endTour,
    setTourStep,
    completeOnboarding,
  } = useOnboardingStore();

  const demoStartedRef = useRef(false);
  const terminalReadyRef = useRef(false);

  const steps: Step[] = [
    {
      target: 'body',
      content: lang === 'ko'
        ? 'SessionCast에 오신 것을 환영합니다! 원격 터미널을 실시간으로 스트리밍하고 어디서든 접속할 수 있습니다. 지금부터 데모를 보여드릴게요.'
        : 'Welcome to SessionCast! Stream your terminal in real-time and access it from anywhere. Let me show you a demo.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="session-list"]',
      content: lang === 'ko'
        ? '연결된 터미널 세션이 여기 표시됩니다. 현재 데모 세션이 연결되어 있어요.'
        : 'Connected terminal sessions appear here. A demo session is now connected.',
      placement: 'right-start',
      disableBeacon: true,
    },
    {
      target: '[data-tour="terminal"]',
      content: lang === 'ko'
        ? '터미널 화면입니다! 지금 Claude Code가 실행되고 있어요. 실시간으로 출력을 보고 명령어를 입력할 수 있습니다.'
        : 'This is your terminal! Claude Code is running now. Watch real-time output and type commands.',
      placement: 'bottom-start',
      disableBeacon: true,
      floaterProps: {
        disableAnimation: true,
      },
    },
    {
      target: '[data-tour="command-bar"]',
      content: lang === 'ko'
        ? '자주 사용하는 명령어를 빠르게 전송하세요. 터미널에 직접 타이핑해도 됩니다.'
        : 'Quickly send common commands here. You can also type directly in the terminal.',
      placement: 'top-start',
      disableBeacon: true,
    },

    {
      target: 'body',
      content: lang === 'ko'
        ? '준비 완료! 터미널에서 자유롭게 명령어를 입력해보세요. 도움이 필요하면 하단의 도움말 버튼을 클릭하세요.'
        : 'All set! Try typing commands in the terminal. Click the Help button at the bottom anytime.',
      placement: 'center',
      disableBeacon: true,
    },
  ];

  // Start demo when tour becomes active
  useEffect(() => {
    if (isTourActive && !demoStartedRef.current) {
      demoStartedRef.current = true;

      // Select demo session immediately
      onSelectDemoSession?.();

      // Wait for terminal to be ready, then start demo
      const checkTerminalAndStartDemo = () => {
        const writer = getTerminalWriter();
        if (writer) {
          terminalReadyRef.current = true;
          mockAgentService.attachToTerminal(writer);

          // Start the Claude Code demo after a short delay
          setTimeout(() => {
            mockAgentService.runDemoScenario('claude');
          }, 500);
        } else {
          // Keep checking until terminal is ready
          setTimeout(checkTerminalAndStartDemo, 100);
        }
      };

      // Start checking after a short delay for DOM to update
      setTimeout(checkTerminalAndStartDemo, 300);
    }

    // Reset when tour ends
    if (!isTourActive) {
      demoStartedRef.current = false;
      terminalReadyRef.current = false;
    }
  }, [isTourActive, onSelectDemoSession]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setTourStep(index + 1);
      } else if (action === ACTIONS.PREV) {
        setTourStep(index - 1);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (status === STATUS.FINISHED) {
        completeOnboarding();
      } else {
        endTour();
      }
    }

    if (action === ACTIONS.CLOSE) {
      endTour();
    }
  }, [setTourStep, endTour, completeOnboarding]);

  if (!isTourActive) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={tourStepIndex}
      run={isTourActive}
      continuous
      showProgress={false}
      showSkipButton
      disableOverlayClose
      disableScrolling
      disableScrollParentFix
      spotlightClicks
      tooltipComponent={CustomTooltip}
      callback={handleJoyrideCallback}
      floaterProps={{
        disableAnimation: false,
        hideArrow: true,
      }}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: 'transparent',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
        },
        spotlight: {
          borderRadius: '12px',
          boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)',
        },
      }}
    />
  );
}
