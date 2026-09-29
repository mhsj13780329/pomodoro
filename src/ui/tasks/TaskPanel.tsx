'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import { useTasks } from '@/application/providers/TasksProvider';
import { splitTasks } from '@/domain/tasks';
import { SelectedTaskZone } from './SelectedTaskZone';
import { TaskItem } from './TaskItem';

/** Drawer body: add form, task lists. On mobile it starts with the drop zone for the selected task. */
export function TaskPanel() {
  const { t } = useT();
  const tasks = useTasks();
  const [title, setTitle] = useState('');
  const [invalid, setInvalid] = useState(false);
  const bodyId = useId();
  const errorId = useId();

  const { incomplete, completed } = splitTasks(tasks.tasks);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await tasks.addTask(title)) {
      setTitle('');
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  const renderItem = (task: (typeof incomplete)[number]) => (
    <TaskItem
      key={task.id}
      task={task}
      selected={tasks.selectedTask?.id === task.id}
      onSelect={tasks.selectTask}
      onToggle={(id) => void tasks.toggleComplete(id)}
      onEdit={tasks.editTask}
      onDelete={(id) => void tasks.deleteTask(id)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby={`${bodyId}-sel`} className="flex flex-col gap-2 md:hidden">
        <h3 id={`${bodyId}-sel`} className="text-caption font-medium text-muted">
          {t('tasks.selectedHeading')}
        </h3>
        <SelectedTaskZone />
      </section>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setInvalid(false);
          }}
          aria-label={t('tasks.add.label')}
          placeholder={t('tasks.add.placeholder')}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-bg px-3 text-body text-fg placeholder:text-muted"
        />
        <button type="submit" className="min-h-11 rounded-control bg-accent px-4 text-body font-medium text-accent-contrast hover:opacity-90">
          {t('tasks.add.submit')}
        </button>
      </form>
      {invalid ? (
        <p id={errorId} role="alert" className="text-caption text-fg">
          {t('tasks.error.titleRequired')}
        </p>
      ) : null}

      {tasks.ready && tasks.tasks.length === 0 ? <p className="text-body text-muted">{t('tasks.empty')}</p> : null}

      {incomplete.length > 0 ? <ul className="flex flex-col gap-1">{incomplete.map(renderItem)}</ul> : null}

      {completed.length > 0 ? (
        <section aria-labelledby={`${bodyId}-done`} className="flex flex-col gap-1">
          <h3 id={`${bodyId}-done`} className="text-caption font-medium text-muted">
            {t('tasks.completed.heading')}
          </h3>
          <ul className="flex flex-col gap-1">{completed.map(renderItem)}</ul>
        </section>
      ) : null}
    </div>
  );
}
