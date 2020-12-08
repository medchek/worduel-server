import WebSocket from "ws";
import { IncomingMessage } from "http";

interface PlayerOptions {
  id: string;
  username: string;
}

// export class Player<WebSocket> {
export class Player {
  private _socket: WebSocket;
  private _username: string;
  private _id: string;
  private _ip: string;
  private _joinedAt: number;
  private _joinedRoomId: string | undefined;
  private _canSendMessages = false; // if the client player can send messages

  // constructor(rawSocket: WebSocket, request: IncomingMessage) {
  constructor(socket: WebSocket, request: IncomingMessage, options: PlayerOptions) {
    const { id, username } = options;
    // this can cannot be undefinde as it will be checked for at handshake time
    this._socket = socket;
    this._ip = request.socket.remoteAddress as string;
    this._joinedAt = Date.now();
    this._id = id;
    this._username = username;
  }

  get socket(): WebSocket {
    return this._socket;
  }
  get id(): string {
    return this._id;
  }
  get ip(): string {
    return this._ip;
  }
  get canSendMessages(): boolean {
    return this._canSendMessages;
  }
  get joinedRoomId(): string | undefined {
    return this._joinedRoomId;
  }

  setPlayerJoinedRoom(roomId: string): void {
    this._joinedRoomId = roomId;
  }
}
