import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
  emitImageProcessing(image: any) {
    this.server.emit('imageProcessing', image);
  }

  emitAlert(alert: any) {
    this.server.emit('alert_created', alert);
  }

  emitModelUpdated(model: any) {
    this.server.emit('model_updated', model);
  }

  emitInspectionResult(result: any) {
    this.server.emit('inspection_result', result);
  }
}
