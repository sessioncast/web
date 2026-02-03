import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MockSession {
  id: string;
  label: string;
  machineId: string;
  status: 'online' | 'offline';
}

interface OnboardingState {
  // 첫 방문 여부
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (value: boolean) => void;

  // 투어 상태
  isTourActive: boolean;
  tourStepIndex: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setTourStep: (index: number) => void;

  // 데모 세션 상태
  isDemoMode: boolean;
  demoSession: MockSession | null;
  startDemoMode: () => void;
  endDemoMode: () => void;

  // 온보딩 완료 여부
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;

  // 전체 초기화
  resetOnboarding: () => void;
}

const DEMO_SESSION: MockSession = {
  id: 'demo-session',
  label: 'Demo Terminal',
  machineId: 'demo-machine',
  status: 'online',
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // 초기 상태
      hasSeenWelcome: false,
      isTourActive: false,
      tourStepIndex: 0,
      isDemoMode: false,
      demoSession: null,
      isOnboardingComplete: false,

      // 액션
      setHasSeenWelcome: (value) => set({ hasSeenWelcome: value }),

      startTour: () => set({
        isTourActive: true,
        tourStepIndex: 0,
        isDemoMode: true,
        demoSession: DEMO_SESSION,
      }),

      endTour: () => set({
        isTourActive: false,
        tourStepIndex: 0,
        hasSeenWelcome: true,
      }),

      nextStep: () => set((state) => ({
        tourStepIndex: state.tourStepIndex + 1
      })),

      prevStep: () => set((state) => ({
        tourStepIndex: Math.max(0, state.tourStepIndex - 1)
      })),

      setTourStep: (index) => set({ tourStepIndex: index }),

      startDemoMode: () => set({
        isDemoMode: true,
        demoSession: DEMO_SESSION
      }),

      endDemoMode: () => set({
        isDemoMode: false,
        demoSession: null
      }),

      completeOnboarding: () => set({
        isOnboardingComplete: true,
        hasSeenWelcome: true,
        isTourActive: false,
        isDemoMode: false,
        demoSession: null,
      }),

      resetOnboarding: () => set({
        hasSeenWelcome: false,
        isTourActive: false,
        tourStepIndex: 0,
        isDemoMode: false,
        demoSession: null,
        isOnboardingComplete: false,
      }),
    }),
    {
      name: 'sessioncast-onboarding',
      partialize: (state) => ({
        hasSeenWelcome: state.hasSeenWelcome,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);
