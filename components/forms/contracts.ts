export type PhiFormAvailabilityProps = {
  disabled?: boolean;
  readOnly?: boolean;
};

export type PhiFormGuardProps = {
  issuedAt: string;
  formToken: string;
};

export type PhiSubmitFormProps<TValues, TLabels> = PhiFormAvailabilityProps & {
  labels: TLabels;
  onSubmit: (values: TValues) => Promise<void>;
};
