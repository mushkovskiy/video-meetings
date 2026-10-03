import { ApiError, type RecordingStatus } from '@/lib/api';

// Mirrors the backend limits (apps/backend: UPLOAD_MAX_RECORDING_SIZE and the
// extension allowlist in recording.controller.ts). "100 MB" is 100 MiB on both
// sides, otherwise a file the client lets through could be rejected by the server.
export const MAX_RECORDING_SIZE = 100 * 1024 * 1024;
export const ALLOWED_RECORDING_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];
export const RECORDING_FILE_ACCEPT = `${ALLOWED_RECORDING_EXTENSIONS.join(',')},audio/*,video/mp4,video/webm`;

const FORMATS_LABEL = ALLOWED_RECORDING_EXTENSIONS.map((extension) => extension.slice(1)).join(
  ', ',
);

const KIB = 1024;
const MIB = KIB * 1024;

const sizeFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const uploadDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

// Returns the reason a file can't be uploaded, or null if it's fine.
export function validateRecordingFile(file: { name: string; size: number }): string | null {
  const dotIndex = file.name.lastIndexOf('.');
  const extension = dotIndex === -1 ? '' : file.name.slice(dotIndex).toLowerCase();

  if (!ALLOWED_RECORDING_EXTENSIONS.includes(extension)) {
    return `Неподдерживаемый формат. Допустимы: ${FORMATS_LABEL}.`;
  }

  if (file.size > MAX_RECORDING_SIZE) {
    return `Файл больше ${MAX_RECORDING_SIZE / MIB} МБ.`;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= MIB) {
    return `${sizeFormatter.format(bytes / MIB)} МБ`;
  }
  if (bytes >= KIB) {
    return `${sizeFormatter.format(bytes / KIB)} КБ`;
  }
  return `${bytes} Б`;
}

export function formatUploadDate(iso: string): string {
  return uploadDateFormatter.format(new Date(iso));
}

export const RECORDING_STATUS_LABELS: Record<RecordingStatus, string> = {
  processing: 'В обработке',
  done: 'Готово',
  failed: 'Ошибка',
};

// 400/413 messages come from the backend already in Russian and explain the
// reason; the rest of the backend messages are English, so map them by status.
export function describeUploadError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
      case 413:
        return error.message;
      case 401:
        return 'Сессия истекла. Войдите снова.';
      case 403:
        return 'У вас нет доступа к этой встрече.';
      case 404:
        return 'Встреча не найдена.';
      case 409:
        return 'У этой встречи уже есть запись.';
      case 0:
        return error.message;
    }
  }

  return 'Не удалось загрузить запись. Попробуйте ещё раз.';
}

export function describeMeetingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'У вас нет доступа к этой встрече.';
    }
    if (error.status === 404 || error.status === 400) {
      return 'Встреча не найдена.';
    }
  }

  return 'Не удалось загрузить встречу.';
}
