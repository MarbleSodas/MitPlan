/**
 * Cross-cutting error types. Domain-specific errors live in
 * @xivmitplan/domain/errors. See architecture §8.2.
 */

export class UnreachableError extends Error {
  constructor(value: never) {
    super(`Unreachable: ${JSON.stringify(value)}`);
    this.name = 'UnreachableError';
  }
}

export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`Not implemented: ${feature}`);
    this.name = 'NotImplementedError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`Configuration: ${message}`);
    this.name = 'ConfigurationError';
  }
}
