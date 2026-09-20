export class HttpError extends Error {
  constructor(
    public readonly httpStatusCode: number,
    public override readonly message: string,
    public readonly detail?: string,
  ) {
    super(message);
  }
}
