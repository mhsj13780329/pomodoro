'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import type { Task } from '@/domain/tasks';
import { CheckIcon, EditIcon, GripIcon, TrashIcon } from '../shell/icons';
import { useTaskDrag } from './useTaskDrag';

interface Props {
  task: Task;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}

const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg';

export function TaskItem({ task, selected, onSelect, onToggle, onEdit, onDelete }: Props) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const drag = useTaskDrag(() => onSelect(task.id));

  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (wasEditing.current) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const startEdit = () => {
    setDraft(task.title);
    setInvalid(false);
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await onEdit(task.id, draft)) setEditing(false);
    else setInvalid(true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditing(false);
    }
  };

  const title = { title: task.title };

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {!editing ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={task.completed}
            aria-label={t(task.completed ? 'tasks.reopen' : 'tasks.complete', title)}
            onClick={() => onToggle(task.id)}
            className={`${iconButton} ${task.completed ? 'text-accent' : ''}`}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full border-2 ${
                task.completed ? 'border-accent bg-accent text-accent-contrast' : 'border-muted'
              }`}
            >
              {task.completed ? <CheckIcon /> : null}
            </span>
          </button>
        ) : null}

        {editing ? (
          <form onSubmit={submit} onKeyDown={onKeyDown} className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setInvalid(false);
              }}
              aria-label={t('tasks.edit.label')}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${task.id}-error` : undefined}
              className="min-h-11 w-full min-w-0 rounded-control border border-border bg-bg px-3 text-body text-fg"
            />
            <div className="flex w-full gap-2">
            <button type="submit" className="min-h-11 flex-1 rounded-control bg-accent px-3 text-body font-medium text-accent-contrast">
              {t('tasks.edit.save')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 flex-1 rounded-control border border-border px-3 text-body text-fg hover:bg-surface-hover"
            >
              {t('tasks.edit.cancel')}
            </button>
            </div>
          </form>
        ) : (
          <>
            {task.completed ? null : (
              <span
                aria-hidden="true"
                title={t('tasks.drag.handle', title)}
                onPointerDown={drag.onPointerDown}
                className="inline-flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
              >
                <GripIcon />
              </span>
            )}
            {task.completed ? (
              <span className="min-w-0 flex-1 break-words px-2 text-body text-muted line-through">{task.title}</span>
            ) : (
              <button
                type="button"
                aria-pressed={selected}
                aria-label={t('tasks.select', title)}
                onClick={() => onSelect(task.id)}
                className={`min-h-11 min-w-0 flex-1 rounded-control px-2 text-start text-body transition-colors hover:bg-surface-hover ${
                  selected ? 'bg-accent-soft font-medium text-fg' : 'text-fg'
                }`}
              >
                <span className="break-words">{task.title}</span>
                {selected ? <span className="ms-2 text-caption text-accent">{t('tasks.selected')}</span> : null}
              </button>
            )}
            <button ref={editButtonRef} type="button" className={iconButton} aria-label={t('tasks.edit', title)} onClick={startEdit}>
              <EditIcon />
            </button>
            <button type="button" className={iconButton} aria-label={t('tasks.delete', title)} onClick={() => onDelete(task.id)}>
              <TrashIcon />
            </button>
          </>
        )}
      </div>
      {drag.ghost ? (
        <div
          aria-hidden="true"
          style={{ left: drag.ghost.x, top: drag.ghost.y }}
          className="pointer-events-none fixed z-50 max-w-60 -translate-x-1/2 -translate-y-1/2 truncate rounded-control border border-accent bg-surface px-3 py-2 text-body text-fg shadow-lg"
        >
          {task.title}
        </div>
      ) : null}
      {invalid ? (
        <p id={`${task.id}-error`} role="alert" className="ps-12 text-caption text-fg">
          {t('tasks.error.titleRequired')}
        </p>
      ) : null}
    </li>
  );
}
