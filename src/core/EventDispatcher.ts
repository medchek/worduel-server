import { Player } from "./Player";
import { Room } from "./Room";

interface Message {
  event: string;
  message?: string;
  code?: number;
  playerId?: string;
  roomId?: string;
  gameId?: number;
  username?: string;
}

export class EventDispatcher {
  // constructor(private player: Player, private room: Room) {}
  // # RoomCreated
  /**
   * Event to inform the used that the room was successfully created
   * @param player the player object
   * @param room the room object
   */
  public roomCreated(player: Player, room: Room): void {
    player.socket.send(
      this.toJson({
        event: "roomCreated",
        playerId: player.id,
        roomId: room.id,
        gameId: room.gameId,
        username: player.username,
      })
    );
  }
  private toJson(json: Message): string {
    return JSON.stringify(json);
  }
}
