import { Chip } from '@heroui/react';

import type { Recording, RecordingStatus } from '@/lib/api';
import { formatFileSize, formatUploadDate, RECORDING_STATUS_LABELS } from '@/lib/recording';

const STATUS_COLORS = {
  processing: 'warning',
  done: 'success',
  failed: 'danger',
} as const satisfies Record<RecordingStatus, 'warning' | 'success' | 'danger'>;

function Transcript({ text }: { text: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid="recording-transcript-section">
      <h3 className="text-base font-semibold">Транскрипция</h3>
      {text ? (
        // A long transcript scrolls inside its own box; it's rendered as plain text.
        <div
          className="bg-surface-secondary max-h-96 overflow-y-auto rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
          data-testid="recording-transcript"
          tabIndex={0}
        >
          {text}
        </div>
      ) : (
        <p className="text-muted text-sm" data-testid="recording-transcript-empty">
          В записи не удалось распознать речь.
        </p>
      )}
    </section>
  );
}

export function RecordingMetadata({ recording }: { recording: Recording }) {
  return (
    <div className="flex flex-col gap-4" data-testid="recording-metadata">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium break-all" data-testid="recording-name">
            {recording.originalName}
          </p>
          <span aria-live="polite">
            <Chip
              color={STATUS_COLORS[recording.status]}
              data-testid="recording-status"
              variant="soft"
            >
              {RECORDING_STATUS_LABELS[recording.status]}
            </Chip>
          </span>
        </div>
        <dl className="text-muted grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>Размер</dt>
          <dd data-testid="recording-size">{formatFileSize(recording.size)}</dd>
          <dt>Загружена</dt>
          <dd data-testid="recording-uploaded-at">{formatUploadDate(recording.uploadedAt)}</dd>
        </dl>
      </div>

      {recording.status === 'processing' && (
        <p className="text-muted text-sm" data-testid="recording-processing-hint">
          Запись расшифровывается — это может занять несколько минут. Страницу можно не обновлять.
        </p>
      )}
      {recording.status === 'done' && <Transcript text={recording.transcript ?? ''} />}
    </div>
  );
}
