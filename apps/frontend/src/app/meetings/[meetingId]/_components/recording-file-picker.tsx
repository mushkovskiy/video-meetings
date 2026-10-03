'use client';

import { Button } from '@heroui/react';
import { useRef, type ChangeEvent } from 'react';

import { RECORDING_FILE_ACCEPT } from '@/lib/recording';

type RecordingFilePickerProps = {
  onSelect: (file: File) => void;
  label?: string;
};

export function RecordingFilePicker({
  onSelect,
  label = 'Выбрать файл записи',
}: RecordingFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again after a rejection fires `change` again.
    event.target.value = '';

    if (file) {
      onSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        accept={RECORDING_FILE_ACCEPT}
        className="hidden"
        data-testid="recording-file-input"
        tabIndex={-1}
        type="file"
        onChange={handleChange}
      />
      <Button
        data-testid="recording-select-button"
        size="lg"
        variant="primary"
        onPress={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      <p className="text-muted text-sm">Форматы: mp3, wav, m4a, mp4, webm. Размер — до 100 МБ.</p>
    </div>
  );
}
