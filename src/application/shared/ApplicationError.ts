export class ApplicationError extends Error {
    constructor(message: string, public readonly code: string, public readonly statusCode: number) {
        super(message);
        this.name = new.target.name;
    }
}

export class ValidationError extends ApplicationError {
    constructor(message: string, code = 'VALIDATION_ERROR') {
        super(message, code, 400);
    }
}

export class NotFoundError extends ApplicationError {
    constructor(message: string, code = 'NOT_FOUND') {
        super(message, code, 404);
    }
}

export class ConflictError extends ApplicationError {
    constructor(message: string, code = 'CONFLICT') {
        super(message, code, 409);
    }
}
