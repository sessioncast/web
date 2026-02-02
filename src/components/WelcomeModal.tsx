import { useState } from 'react';
import { useLanguage } from '../i18n';
import './WelcomeModal.css';

interface WelcomeModalProps {
  onClose: () => void;
  onStartSetup: () => void;
  onViewDemo?: () => void;
  onSelectScenario: (scenario: string) => void;
}

type Step = 'welcome' | 'scenario' | 'demo';

export function WelcomeModal({ onClose, onStartSetup, onSelectScenario }: WelcomeModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('welcome');
  const [demoText, setDemoText] = useState('');

  const scenarios = [
    { id: 'team', icon: '👨‍💻', title: t('scenarioTeam'), desc: t('scenarioTeamDesc') },
    { id: 'cicd', icon: '🤖', title: t('scenarioCicd'), desc: t('scenarioCicdDesc') },
    { id: 'streaming', icon: '📺', title: t('scenarioStreaming'), desc: t('scenarioStreamingDesc') },
    { id: 'debug', icon: '🔧', title: t('scenarioDebug'), desc: t('scenarioDebugDesc') },
  ];

  const demoLines = [
    '$ neofetch',
    '',
    '       _,met$$$$$gg.          user@sessioncast',
    '    ,g$$$$$$$$$$$$$$$P.       ----------------',
    '  ,g$$P"     """Y$$.".        OS: Ubuntu 22.04 LTS',
    ' ,$$P\'              `$$$.     Host: SessionCast Demo',
    '\',$$P       ,ggs.     `$$b:   Kernel: 5.15.0-generic',
    '`d$$\'     ,$P"\'   .    $$$    Shell: bash 5.1.16',
    ' $$P      d$\'     ,    $$P    Terminal: xterm-256color',
    ' $$:      $$.   -    ,d$$\'    ',
    ' $$;      Y$b._   _,d$P\'      Memory: 7.8 GiB / 16 GiB',
    ' Y$$.    `.`"Y$$$$P"\'         ',
    ' `$$b      "-.__              ',
    '  `Y$$                        ',
    '   `Y$$.                      ',
    '     `$$b.                    ',
    '       `Y$$b.                 ',
    '          `"Y$b._             ',
    '              `"""            ',
    '',
    '$ echo "Welcome to SessionCast!"',
    'Welcome to SessionCast!',
    '',
    '$ _'
  ];

  const startDemo = () => {
    setStep('demo');
    setDemoText('');

    let currentIndex = 0;
    const typeNextLine = () => {
      if (currentIndex < demoLines.length) {
        setDemoText(prev => prev + demoLines[currentIndex] + '\n');
        currentIndex++;
        setTimeout(typeNextLine, currentIndex < 3 ? 100 : 50);
      }
    };
    setTimeout(typeNextLine, 500);
  };

  const handleScenarioSelect = (scenarioId: string) => {
    onSelectScenario(scenarioId);
    onClose();
  };

  return (
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="welcome-close" onClick={onClose}>×</button>

        {step === 'welcome' && (
          <div className="welcome-content">
            <div className="welcome-icon">👋</div>
            <h1>{t('welcomeTitle')}</h1>
            <p className="welcome-subtitle">{t('welcomeSubtitle')}</p>

            <div className="welcome-actions">
              <button className="welcome-btn primary" onClick={() => { onStartSetup(); onClose(); }}>
                <span className="btn-icon">🖥️</span>
                {t('welcomeConnect')}
              </button>
              <button className="welcome-btn secondary" onClick={startDemo}>
                <span className="btn-icon">▶️</span>
                {t('welcomeDemo')}
              </button>
              <button className="welcome-btn secondary" onClick={() => setStep('scenario')}>
                <span className="btn-icon">📖</span>
                {t('welcomeTour')}
              </button>
            </div>

            <div className="welcome-skip">
              <button onClick={onClose}>{t('welcomeSkip')}</button>
            </div>
          </div>
        )}

        {step === 'scenario' && (
          <div className="welcome-content scenario-content">
            <h2>{t('scenarioTitle')}</h2>
            <p className="scenario-subtitle">{t('scenarioSubtitle')}</p>

            <div className="scenario-grid">
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  className="scenario-card"
                  onClick={() => handleScenarioSelect(scenario.id)}
                >
                  <span className="scenario-icon">{scenario.icon}</span>
                  <span className="scenario-title">{scenario.title}</span>
                  <span className="scenario-desc">{scenario.desc}</span>
                </button>
              ))}
            </div>

            <button className="welcome-back" onClick={() => setStep('welcome')}>
              ← {t('welcomeBack')}
            </button>
          </div>
        )}

        {step === 'demo' && (
          <div className="welcome-content demo-content">
            <h2>{t('demoTitle')}</h2>
            <div className="demo-terminal">
              <div className="demo-terminal-header">
                <span className="demo-dot red"></span>
                <span className="demo-dot yellow"></span>
                <span className="demo-dot green"></span>
                <span className="demo-terminal-title">demo@sessioncast: ~</span>
              </div>
              <pre className="demo-terminal-body">{demoText}</pre>
            </div>
            <p className="demo-hint">{t('demoHint')}</p>

            <div className="demo-actions">
              <button className="welcome-btn primary" onClick={() => { onStartSetup(); onClose(); }}>
                {t('demoStart')}
              </button>
              <button className="welcome-back" onClick={() => setStep('welcome')}>
                ← {t('welcomeBack')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
