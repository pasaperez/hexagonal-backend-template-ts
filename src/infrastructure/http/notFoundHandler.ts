import type { Request, RequestHandler, Response } from 'express';
import { buildNotFoundHttpResponse } from './httpResponses';

export const notFoundHandler: RequestHandler = (_request: Request, response: Response): void => {
    const notFoundResponse: ReturnType<typeof buildNotFoundHttpResponse> = buildNotFoundHttpResponse();

    response.status(notFoundResponse.statusCode).json(notFoundResponse.body);
};
