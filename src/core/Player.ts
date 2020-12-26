import WebSocket from "ws";
import { IncomingMessage } from "http";

interface PlayerOptions {
  id: string;
  username: string;
}

// a member is similar to the player interface but is entended to be exposed to the client
// it contains none sensetive player data
export interface PublicMember {
  username: string;
  id: string;
  score: number;
  isLeader: boolean;
  isTurn: boolean;
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
  // Game options
  private _score = 0;
  private _isTurn = false;
  private _isLeader = false;

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
  get username(): string {
    return this._username;
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
  get score(): number {
    return this._score;
  }
  get isTurn(): boolean {
    return this._isTurn;
  }
  get isLeader(): boolean {
    return this._isLeader;
  }
  /**
   * A Player object intented to be sent to the client.
   * @return non-sensitive data (i.e. without socket object, ip..etc) about the player.
   *
   */
  get getAsPublicMember(): PublicMember {
    return {
      id: this._id,
      username: this._username,
      score: this._score,
      isLeader: this._isLeader,
      isTurn: this._isTurn,
    };
  }

  disconnect(): void {
    this._socket.close();
  }

  setAsLeader(): void {
    this._isLeader = true;
  }
  setPlayerJoinedRoom(roomId: string): void {
    this._joinedRoomId = roomId;
  }
}
