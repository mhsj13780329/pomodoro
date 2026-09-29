'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useTasks } from '@/application/providers/TasksProvider';
import { CloseIcon } from '../shell/icons';

/**
 * Drop target for the selected task. `readOnly` shows only the chosen task (no placeholder,
 * no drop target, no clear button); it renders nothing while no task is selected.
 */
export function SelectedTaskZone({
  readOnly = false,
  centered = false,
  className = '',
}: {
  readOnly?: boolean;
  centered?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const { selectedTask, selectTask } = useTasks();

  if (readOnly && !selectedTask) return null;

  const props = readOnly ? {} : { 'data-drop-zone': '' };
  return (
    <div
      role="group"
      aria-label={t('tasks.dropzone.label')}
      {...props}
      className={`flex min-h-12 w-full items-center gap-2 rounded-card border-2 px-4 py-2 transition-colors motion-reduce:transition-none ${
        selectedTask
          ? 'border-transparent'
          : 'border-dashed border-border text-muted data-[drop-over=true]:border-accent'
      } data-[drop-over=true]:border-accent data-[drop-over=true]:bg-accent-soft ${className}`}
    >
      {selectedTask ? (
        <>
          <p className={`min-w-0 flex-1 break-words text-body font-medium text-fg ${centered ? 'text-center' : ''}`}>{selectedTask.title}</p>
          {readOnly ? null : (
            <button
              type="button"
              aria-label={t('tasks.dropzone.clear', { title: selectedTask.title })}
              onClick={() => selectTask(null)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-hover hover:text-fg"
            >
              <CloseIcon />
            </button>
          )}
        </>
      ) : (
        <p className="w-full text-center text-body">{t('tasks.dropzone.empty')}</p>
      )}
    </div>
  );
}
