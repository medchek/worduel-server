import { Player } from "./Player";
import { Room, PublicMembers } from "./Room";

interface Message {
  event: string;
  message?: string;
  code?: number;
  playerId?: string;
  roomId?: string;
  gameId?: number;
  username?: string;
  party?: PublicMembers;
}

export class EventDispatcher {
  // constructor(private player: Player, private room: Room) {}
  // # RoomCreated
  /**
   * Event to inform the client that the room was successfully created
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

  // # RoomJoined
  /**
   * Event to inform the client that the room was successfully joined
   * @param player the player object
   * @param room the room object
   */
  public roomJoined(player: Player, room: Room): void {
    player.socket.send(
      this.toJson({
        event: "roomJoined",
        playerId: player.id,
        roomId: room.id,
        gameId: room.gameId,
        username: player.username,
        party: room.getPublicMembers(),
      })
    );
  }
  private toJson(json: Message): string {
    return JSON.stringify(json);
  }
}
