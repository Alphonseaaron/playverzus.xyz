export class PlayVerzusError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export const AntigravityError = PlayVerzusError;

export class WalletError extends AntigravityError {
  constructor(
    public override readonly code:
      | 'INSUFFICIENT_FUNDS'
      | 'INVALID_AMOUNT'
      | 'NOT_IMPLEMENTED'
      | 'IDEMPOTENCY_CONFLICT'
      | 'PAYOUT_FAILED',
    message: string,
    meta?: Record<string, unknown>,
  ) {
    super(code, message, meta);
  }
}

export class MatchStateError extends AntigravityError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super('MATCH_STATE', message, meta);
  }
}

export class ValidationError extends AntigravityError {
  constructor(message: string, public readonly errors: string[] = [], meta?: Record<string, unknown>) {
    super('VALIDATION', message, meta);
  }
}

export class ParseError extends AntigravityError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super('PARSE', message, meta);
  }
}

export class NotFoundError extends AntigravityError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} ${id} not found`, { entity, id });
  }
}
