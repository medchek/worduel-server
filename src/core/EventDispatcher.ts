import { Player, PublicMember } from "./Player";
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
  player?: PublicMember;
}

export class EventDispatcher {
  private toJson(json: Message): string {
    return JSON.stringify(json);
  }

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
    // FIXME client also needs to recive current room settings (selected game, difficulty, round count...etc)
    // which are yet to be implemented
    player.socket.send(
      this.toJson({
        event: "roomJoined",
        playerId: player.id,
        roomId: room.id,
        gameId: room.gameId,
        party: room.getPublicMembers(),
      })
    );
    // inform the other players that a new member joined
    this.newPlayerJoined(room, player);
  }
  // # PlayerHasJoined

  /**
   * Event to inform all the clients in the room except the joined player that a new member has joined the room
   * @param room the room object that was joined
   * @param player the Player object that has joined the room
   */
  private newPlayerJoined(room: Room, player: Player): void {
    const data: Message = {
      event: "playerJoinedParty",
      player: player.getAsPublicMember,
    };
    this.toAllButOne(room, player.id, data);
  }
  /**
   * Event to inform all the clients in the room except the disconnected player that a memeber has left the room
   * @param room the room object that was joined
   * @param player the Player object that has joined the room
   */
  public playerHasDisconnected(room: Room, player: Player): void {
    //
    const data: Message = {
      event: "playerLeftParty",
      playerId: player.id,
    };
    this.toAllButOne(room, player.id, data);
  }
  /**
   * Send the event data to all the players in the given Room except the playerId
   * @param room the room to send data to
   * @param playerId the player id data will not be sent to
   * @param data the event data
   */
  private toAllButOne(room: Room, playerId: string, data: Message) {
    room.members.forEach((player, id) => {
      if (id !== playerId) {
        player.socket.send(this.toJson(data));
      }
    });
  }
  /**
   * Send the event data to all the players in the given room
   * @param room the room object to send data to
   * @param data the data to be sent
   */
  private toAll(room: Room, data: Message): void {
    room.members.forEach((player) => {
      player.socket.send(this.toJson(data));
    });
  }
}
