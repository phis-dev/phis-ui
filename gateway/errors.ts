import "server-only";

export class PhiCmsGatewayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PhiCmsGatewayError";
    this.status = status;
  }
}

export function isPhiCmsGatewayError(error: unknown): error is PhiCmsGatewayError {
  return error instanceof PhiCmsGatewayError;
}

export function isPhiCmsGatewayAuthError(error: unknown): error is PhiCmsGatewayError {
  return isPhiCmsGatewayError(error) && (error.status === 401 || error.status === 403);
}

export function throwPhiCmsGatewayError(message: string, status: number): never {
  throw new PhiCmsGatewayError(message, status);
}
