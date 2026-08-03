export class ChaCustomsMasterError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ChaCustomsMasterError";
  }
}

export function getSafeErrorMessage(error: unknown) {
  if (error instanceof ChaCustomsMasterError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete customs master operation.";
}
