'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createLocalStore } from '@/data/local/localStore';
import { createTaskRepository } from '@/data/local/taskRepository';
import { createSessionStore } from '@/data/session/sessionStore';
import { createTimerStateRepository } from '@/data/session/timerStateRepository';
import type { TaskRepository, TimerStateRepository } from '@/domain/repositories';
import { completeTask, createTask, editTitle, effectiveSelection, reopenTask } from '@/domain/tasks';
import type { Task } from '@/domain/tasks';
import { systemClock } from '@/platform/clock';
import { newId } from '@/platform/ids';

export interface TasksContextValue {
  ready: boolean;
  tasks: Task[];
  /** The selected task, or null when nothing valid is selected (this tab only). */
  selectedTask: Task | null;
  /** Returns false when the title is invalid. */
  addTask: (title: string) => Promise<boolean>;
  editTask: (id: string, title: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  selectTask: (id: string | null) => void;
  /** Reads storage fresh; for the completion pipeline, which may run before or outside React state. */
  resolveSelectedTaskId: () => Promise<string | null>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const repos = useRef<{ tasks: TaskRepository; tab: TimerStateRepository } | null>(null);

  const getRepos = useCallback(() => {
    if (!repos.current) {
      repos.current = {
        tasks: createTaskRepository(createLocalStore()),
        tab: createTimerStateRepository(createSessionStore()),
      };
    }
    return repos.current;
  }, []);

  useEffect(() => {
    const { tasks: taskRepo, tab } = getRepos();
    let cancelled = false;
    void Promise.all([taskRepo.list(), tab.loadSelectedTaskId()]).then(([list, id]) => {
      if (cancelled) return;
      setTasks(list);
      setSelectedId(id);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [getRepos]);

  // After every write the list is re-read, so tasks added in another tab appear too.
  const refresh = useCallback(async () => {
    setTasks(await getRepos().tasks.list());
  }, [getRepos]);

  const selectTask = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      void getRepos().tab.saveSelectedTaskId(id);
    },
    [getRepos],
  );

  const clearSelectionIf = useCallback(
    (id: string) => {
      if (selectedId === id) selectTask(null);
    },
    [selectedId, selectTask],
  );

  const addTask = useCallback(
    async (title: string) => {
      const task = createTask(title, { id: newId(), now: systemClock.now() });
      if (!task) return false;
      await getRepos().tasks.add(task);
      await refresh();
      return true;
    },
    [getRepos, refresh],
  );

  const editTask = useCallback(
    async (id: string, title: string) => {
      const current = (await getRepos().tasks.list()).find((t) => t.id === id);
      if (!current) {
        await refresh();
        return true;
      }
      const next = editTitle(current, title, systemClock.now());
      if (!next) return false;
      await getRepos().tasks.update(id, { title: next.title, updatedAt: next.updatedAt });
      await refresh();
      return true;
    },
    [getRepos, refresh],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await getRepos().tasks.remove(id);
      clearSelectionIf(id);
      await refresh();
    },
    [getRepos, refresh, clearSelectionIf],
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const current = (await getRepos().tasks.list()).find((t) => t.id === id);
      if (current) {
        const now = systemClock.now();
        const next = current.completed ? reopenTask(current, now) : completeTask(current, now);
        await getRepos().tasks.update(id, {
          completed: next.completed,
          completedAt: next.completedAt,
          updatedAt: next.updatedAt,
        });
        if (next.completed) clearSelectionIf(id);
      }
      await refresh();
    },
    [getRepos, refresh, clearSelectionIf],
  );

  const resolveSelectedTaskId = useCallback(async () => {
    const { tasks: taskRepo, tab } = getRepos();
    const [id, list] = await Promise.all([tab.loadSelectedTaskId(), taskRepo.list()]);
    return effectiveSelection(id, list);
  }, [getRepos]);

  const selectedTask = useMemo(() => {
    const id = effectiveSelection(selectedId, tasks);
    return tasks.find((t) => t.id === id) ?? null;
  }, [selectedId, tasks]);

  const value = useMemo(
    () => ({ ready, tasks, selectedTask, addTask, editTask, deleteTask, toggleComplete, selectTask, resolveSelectedTaskId }),
    [ready, tasks, selectedTask, addTask, editTask, deleteTask, toggleComplete, selectTask, resolveSelectedTaskId],
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
