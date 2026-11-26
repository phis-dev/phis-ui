export type PhiAuthSecurityWidgetLabels = {
  intro: string;
  /** The way out of either confirmation; each answers with the action's own word. */
  confirmCancel: string;
  errors: {
    unavailable: string;
    loadFailed: string;
    csrfFailed: string;
    factorRemoveFailed: string;
    sessionRevokeFailed: string;
  };
  authenticators: {
    title: string;
    add: string;
    empty: string;
    unnamed: string;
    lastUsed: string;
    neverUsed: string;
    required: string;
    removeConfirm: string;
    remove: string;
  };
  providers: {
    title: string;
    empty: string;
  };
  sessions: {
    title: string;
    empty: string;
    current: string;
    other: string;
    noDeviceDetails: string;
    revoked: string;
    active: string;
    revokeConfirm: string;
    revoke: string;
  };
};

export function formatPhiAuthSecurityWidgetLabel(template: string, value: string | number) {
  return template.replace("%1", String(value));
}
