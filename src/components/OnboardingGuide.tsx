import { useLanguage } from '../i18n';
import './OnboardingGuide.css';

interface OnboardingGuideProps {
  authToken: string;
  onAuthError?: () => void;
}

export function OnboardingGuide(_props: OnboardingGuideProps) {
  const { t } = useLanguage();

  return (
    <div className="onboarding-guide">
      <div className="onboarding-header">
        <h1>{t('welcome')}</h1>
        <p>{t('noMachines')}</p>
      </div>

      <div className="setup-steps">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>{t('step1Title')}</h3>
            <p>{t('step1Desc')}</p>
            <div className="code-block">
              <code>npm install -g sessioncast-cli</code>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>{t('step2Title')}</h3>
            <p>{t('step2Desc')}</p>
            <div className="code-block">
              <code>sessioncast login</code>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>{t('step3Title')}</h3>
            <p>{t('step3Desc')}</p>
            <div className="code-block">
              <code>tmux new-session -d -s work</code>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>{t('step4Title')}</h3>
            <p>{t('step4Desc')}</p>
            <div className="code-block">
              <code>sessioncast agent</code>
            </div>
            <p className="hint">{t('step4Hint')}</p>
          </div>
        </div>
      </div>

      <div className="onboarding-footer">
        <p>{t('footerConnected')}</p>
        <p className="security-note">{t('footerSecurity')}</p>
      </div>
    </div>
  );
}
