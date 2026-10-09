import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { namedLogger } from '@playverzus/core';

const log = namedLogger('RealtimeGateway');

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    log.info({ socketId: client.id }, 'client connected to realtime websocket');
  }

  handleDisconnect(client: Socket) {
    log.info({ socketId: client.id }, 'client disconnected from realtime websocket');
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (!data?.room) return;
    client.join(data.room);
    log.info({ socketId: client.id, room: data.room }, 'client joined room');
    return { status: 'subscribed', room: data.room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (!data?.room) return;
    client.leave(data.room);
    return { status: 'unsubscribed', room: data.room };
  }

  broadcastToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }
}
