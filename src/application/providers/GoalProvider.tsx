'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createGoalRepository } from '@/data/local/goalRepository';
import { createLocalStore } from '@/data/local/localStore';
import { clampGoal, defaultGoal } from '@/domain/goals';
import type { Goal } from '@/domain/goals';
import type { GoalRepository } from '@/domain/repositories';

interface GoalContextValue {
  goal: Goal;
  setDailyPomodoros: (n: number) => void;
}

const GoalContext = createContext<GoalContextValue | null>(null);

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<Goal>(() => defaultGoal());
  const repo = useRef<GoalRepository | null>(null);

  useEffect(() => {
    let cancelled = false;
    const r = createGoalRepository(createLocalStore());
    repo.current = r;
    void r.load().then((loaded) => {
      if (!cancelled && loaded) setGoal(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setDailyPomodoros = useCallback((n: number) => {
    const next = { dailyPomodoros: clampGoal(n) };
    setGoal(next);
    void repo.current?.save(next);
  }, []);

  const value = useMemo(() => ({ goal, setDailyPomodoros }), [goal, setDailyPomodoros]);
  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoal(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoal must be used inside GoalProvider');
  return ctx;
}
