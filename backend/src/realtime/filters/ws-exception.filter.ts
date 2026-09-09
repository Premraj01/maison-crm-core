import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { WS_OUTBOUND } from '../realtime.constants';

/**
 * Turns any throw inside a gateway handler into a single `error` message rather
 * than an unhandled rejection that silently drops the client's request.
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const socket = host.switchToWs().getClient<Socket>();

    const message =
      exception instanceof WsException
        ? exception.getError()
        : exception instanceof Error
          ? exception.message
          : 'Internal websocket error';

    if (!(exception instanceof WsException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    socket.emit(WS_OUTBOUND.ERROR, {
      message: typeof message === 'string' ? message : 'Internal websocket error',
      emittedAt: new Date().toISOString(),
    });
  }
}
