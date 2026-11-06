export class ApiError extends Error {
  constructor(public statusCode: number, public code: string) { super(code); }
}
