import "server-only";

import type { PhiFormDefinitionLike } from "../components/forms/form-resolution";
import type {
  PhiFormHandlerCredentialPolicy,
  PhiFormHandlerProviderDescriptor,
} from "../types/form-descriptor";

export type PhiFormSubmitCategory = "auth" | "account" | "forms" | "site";

export type PhiFormSubmitTransport = "relay" | "api" | "serverAction";

export type PhiFormSubmitMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type PhiFormSubmitDescriptor = {
  formId: string;
  submitHandlerKey: string;
  category: PhiFormSubmitCategory;
  transport: PhiFormSubmitTransport;
  method: PhiFormSubmitMethod;
  endpointKey: string | null;
  actionKey: string | null;
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  credentialPolicy: PhiFormHandlerCredentialPolicy;
};

export type PhiFormPreviewDescriptor = {
  formId: string;
};

export type PhiFormSubmitTarget = PhiFormSubmitDescriptor & {
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  routeTarget: string;
};

type PhiFormSubmitDescriptorInput = {
  formId: string;
  submitHandlerKey: string;
  category?: string | null;
  transport?: string | null;
  endpointKey?: string | null;
  actionKey?: string | null;
  method?: string | null;
  upstreamPath?: string | null;
  csrfPath?: string | null;
  requiresCsrf?: boolean | null;
  credentialPolicy?: PhiFormHandlerCredentialPolicy;
};

type PhiFormDefinitionLikeWithPreview = Pick<
  PhiFormDefinitionLike,
  | "formId"
  | "previewHandlerKey"
  | "previewUpstreamPath"
  | "submitHandlerKey"
  | "category"
> & {
  config?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
};

function normalizeFormId(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSubmitHandlerKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCategory(value: string | null | undefined): PhiFormSubmitCategory | null {
  if (value == null) {
    return null;
  }
  if (value === "auth" || value === "account" || value === "forms" || value === "site") {
    return value;
  }
  throw new Error(`Unknown form submit category "${value}".`);
}

/*
 * Each of these is read as stated or refused. A value outside the vocabulary used to be rewritten --
 * `api` into `serverAction`, anything unknown into `relay` or `POST` -- so a handler ran differently
 * from how it was declared, and nothing said so. Only an absent value takes the default.
 */
function normalizeTransport(value: string | null | undefined): PhiFormSubmitTransport {
  if (value == null) {
    return "relay";
  }
  if (value === "relay" || value === "api" || value === "serverAction") {
    return value;
  }
  throw new Error(`Unknown form submit transport "${value}".`);
}

function normalizeMethod(value: string | null | undefined): PhiFormSubmitMethod {
  if (value == null) {
    return "POST";
  }
  if (
    value === "GET" || value === "POST" || value === "PUT" || value === "PATCH" || value === "DELETE"
  ) {
    return value;
  }
  throw new Error(`Unknown form submit method "${value}".`);
}

function resolveSubmitCategory(submitHandlerKey: string, explicitCategory?: string | null) {
  const category = normalizeCategory(explicitCategory);
  if (category) {
    return category;
  }

  const normalizedKey = normalizeSubmitHandlerKey(submitHandlerKey);
  if (normalizedKey.startsWith("auth.")) {
    return "auth";
  }
  if (normalizedKey.startsWith("account.")) {
    return "account";
  }
  if (normalizedKey.startsWith("site.")) {
    return "site";
  }

  return "forms";
}

function readConfigString(
  config: Record<string, unknown> | undefined,
  key: string,
): string | null {
  if (!config) {
    return null;
  }

  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readConfigPath(
  config: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = readConfigString(config, key);
  if (!value) {
    return null;
  }

  return value.startsWith("/") ? value : `/${value}`;
}

function resolveEndpointKey(
  input: PhiFormSubmitDescriptorInput,
): string | null {
  const explicitEndpointKey =
    typeof input.endpointKey === "string" && input.endpointKey.trim()
      ? input.endpointKey.trim()
      : null;
  if (explicitEndpointKey) {
    return explicitEndpointKey;
  }

  return null;
}

function resolveCategoryPrefix(category: PhiFormSubmitCategory) {
  switch (category) {
    case "auth":
      return "/api/v1/auth";
    case "account":
      return "/api/account";
    case "forms":
      return "/api/forms";
    case "site":
      return "/api/site/forms";
  }
}

function resolveUpstreamPath(
  category: PhiFormSubmitCategory,
  endpointKey: string | null,
  upstreamPath: string | null,
): string {
  if (upstreamPath) {
    return upstreamPath;
  }

  const prefix = resolveCategoryPrefix(category);
  if (endpointKey) {
    return `${prefix}/${endpointKey.replace(/^\/+/, "")}`;
  }

  return prefix;
}

function readPreviewHandlerKey(
  explicitPreviewHandlerKey: string | null | undefined,
  config: Record<string, unknown> | undefined,
) {
  const explicit = typeof explicitPreviewHandlerKey === "string" ? explicitPreviewHandlerKey.trim() : "";
  if (explicit) {
    return explicit;
  }

  return readConfigString(config, "previewHandlerKey");
}

export function buildPhiFormSubmitDescriptor(
  input: PhiFormSubmitDescriptorInput,
): PhiFormSubmitDescriptor {
  const formId = normalizeFormId(input.formId);
  const submitHandlerKey = normalizeSubmitHandlerKey(input.submitHandlerKey);
  const category = resolveSubmitCategory(submitHandlerKey, input.category);
  const endpointKey = resolveEndpointKey(input);
  const upstreamPath =
    typeof input.upstreamPath === "string" && input.upstreamPath.trim()
      ? readConfigPath({ upstreamPath: input.upstreamPath }, "upstreamPath")
      : null;
  const csrfPath =
    typeof input.csrfPath === "string" && input.csrfPath.trim()
      ? readConfigPath({ csrfPath: input.csrfPath }, "csrfPath")
      : null;

  return {
    formId,
    submitHandlerKey,
    category,
    transport: normalizeTransport(input.transport),
    method: normalizeMethod(input.method),
    endpointKey,
    actionKey:
      typeof input.actionKey === "string" && input.actionKey.trim()
        ? input.actionKey.trim()
        : null,
    upstreamPath,
    csrfPath,
    requiresCsrf: Boolean(input.requiresCsrf),
    credentialPolicy: input.credentialPolicy ?? "none",
  };
}

export function resolvePhiFormSubmitTarget(
  descriptor: PhiFormSubmitDescriptor,
): PhiFormSubmitTarget {
  const upstreamPath = resolveUpstreamPath(
    descriptor.category,
    descriptor.endpointKey,
    descriptor.upstreamPath,
  );

  return {
    ...descriptor,
    upstreamPath,
    csrfPath: descriptor.csrfPath ?? null,
    requiresCsrf: descriptor.requiresCsrf,
    routeTarget: `${descriptor.category}:${upstreamPath}`,
  };
}

export function buildPhiFormSubmitDescriptorFromHandlerProvider(
  formId: string,
  provider: PhiFormHandlerProviderDescriptor,
): PhiFormSubmitDescriptor {
  return buildPhiFormSubmitDescriptor({
    formId,
    submitHandlerKey: provider.handlerKey,
    category: provider.category,
    transport: provider.transport,
    method: provider.method,
    endpointKey: provider.endpointKey,
    upstreamPath: provider.upstreamPath,
    csrfPath: provider.csrfPath,
    requiresCsrf: provider.requiresCsrf,
    credentialPolicy: provider.credentialPolicy,
  });
}

export function buildPhiFormPreviewDescriptor(
  input: Pick<PhiFormPreviewDescriptor, "formId">,
): PhiFormPreviewDescriptor {
  return { formId: normalizeFormId(input.formId) };
}

export function buildPhiFormPreviewDescriptorFromDefinition(
  definition: PhiFormDefinitionLikeWithPreview,
): PhiFormPreviewDescriptor | null {
  const previewHandlerKey = readPreviewHandlerKey(definition.previewHandlerKey, undefined);
  if (!previewHandlerKey) {
    return null;
  }

  return buildPhiFormPreviewDescriptor({
    formId: definition.formId,
  });
}
