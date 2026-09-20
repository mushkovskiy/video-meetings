'use client';

import { useCallback, useState, type FormEvent, type RefObject } from 'react';

import { ApiError } from '@/lib/api';

type Validators<TField extends string> = Record<TField, (value: string) => string | undefined>;
type Values<TField extends string> = Record<TField, string>;
type FieldErrors<TField extends string> = Partial<Record<TField, string>>;

export type ValidatedForm<TField extends string> = {
  values: Values<TField>;
  fieldErrors: FieldErrors<TField>;
  formError: string | null;
  isSubmitting: boolean;
  refs: Record<TField, RefObject<HTMLInputElement | null>>;
  setField: (name: TField) => (value: string) => void;
  validateOnBlur: (name: TField) => () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

// Generic validated-form workflow shared by every auth form on the site:
// track field values/errors, validate-and-focus-first-invalid on submit,
// and surface API failures as a single form-level error. Callers only
// supply the field list, per-field validators and what "valid" means.
export function useValidatedForm<TField extends string>(
  fields: readonly TField[],
  validators: Validators<TField>,
  initialValues: Values<TField>,
  onValid: (values: Values<TField>) => Promise<void>,
): ValidatedForm<TField> {
  const [values, setValues] = useState<Values<TField>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lazy useState initializer instead of useRef: the individual field refs
  // only need a stable identity across renders (for the `ref` prop), and
  // reading a state value during render — unlike reading ref.current — is
  // exactly what useState is for.
  const [refs] = useState(
    () =>
      Object.fromEntries(fields.map((field) => [field, { current: null }])) as Record<
        TField,
        RefObject<HTMLInputElement | null>
      >,
  );

  const setField = useCallback(
    (name: TField) => (value: string) => {
      setValues((current) => ({ ...current, [name]: value }));
      // Clear the error as soon as the field becomes valid, so the message
      // doesn't linger while the user is fixing it.
      setFieldErrors((current) =>
        current[name] && !validators[name](value) ? { ...current, [name]: undefined } : current,
      );
    },
    [validators],
  );

  const validateOnBlur = useCallback(
    (name: TField) => () => {
      setFieldErrors((current) => ({ ...current, [name]: validators[name](values[name]) }));
    },
    [validators, values],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const nextErrors: FieldErrors<TField> = {};
      for (const name of fields) {
        nextErrors[name] = validators[name](values[name]);
      }
      setFieldErrors(nextErrors);

      const firstInvalid = fields.find((name) => nextErrors[name]);
      if (firstInvalid) {
        setFormError('Check the highlighted fields and try again.');
        refs[firstInvalid].current?.focus();
        return;
      }

      setIsSubmitting(true);
      onValid(values).catch((err: unknown) => {
        setFormError(
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        );
        setIsSubmitting(false);
      });
    },
    [fields, onValid, refs, validators, values],
  );

  return {
    values,
    fieldErrors,
    formError,
    isSubmitting,
    refs,
    setField,
    validateOnBlur,
    handleSubmit,
  };
}
