import { RoomManager } from "./RoomManager";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import { Player } from "./Player";
import { nanoid } from "nanoid";

interface AddPlayerOptions {
  socket: WebSocket;
  req: IncomingMessage;
  username: string;
}
interface RemovePlayerOptions {
  id: string;
  terminateSocket?: boolean;
}

export class PlayerManager {
  // private playerList: Map<string, Player<WebSocket>> = new Map();
  private playerList: Map<string, Player> = new Map();
  private roomList!: RoomManager;

  get allPlayer(): Map<string, Player> {
    return this.playerList;
  }

  /**
   * !!! This method MUST be called before using any of the other class methods
   * @param roomList
   */
  attachRoomList(roomList: RoomManager): void {
    this.roomList = roomList;
  }

  getPlayerById(id: string): Player | undefined {
    return this.playerList.get(id);
  }
  /**
   * Create and Store a player in the list
   * @param options the socket instance, the client request and the username
   * @returns the created player object
   */
  createPlayer(options: AddPlayerOptions): Player {
    const { socket, req, username } = options;
    const uid = nanoid();
    const player = new Player(socket, req, { id: uid, username });
    this.playerList.set(uid, player);

    return player;
  }
  /**
   * Removes the player from the player list, and optionally closes the socket if it is still open.
   * @param options Option object containing the player Id and terminateSocket boolean indicating wheter to close the socket or not.
   */
  removePlayer(options: RemovePlayerOptions): boolean {
    const { id, terminateSocket } = options;

    if (terminateSocket) {
      const player = this.getPlayerById(id);
      if (player) {
        if (player.socket.readyState === 1) {
          // readyState 1 = OPEN
          player.socket.close();
        }
      } else {
        console.error("Could not terminate socket. Player not found in list");
      }
    }

    const hasBeenDeleted = this.playerList.delete(id);
    if (hasBeenDeleted) {
      console.log("Player sucessfully deleted from PlayerList");
    } else {
      console.error("Could not find a player with the provided id in PlayerList");
    }
    return hasBeenDeleted;
  }
}
