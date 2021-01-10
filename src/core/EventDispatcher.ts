import { RoomSettings } from "./../config/roomSettings";
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
  settings?: RoomSettings;
  sid?: number; // setting id
  sval?: number | string;
  newLeaderId?: string;
}

export class EventDispatcher {
  private toJson(json: Message): string {
    return JSON.stringify(json);
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
    // FIXME FIXED : client also needs to recive current room settings (selected game, difficulty, round count...etc)
    // which are yet to be implemented
    const data: Message = {
      event: "roomJoined",
      playerId: player.id,
      roomId: room.id,
      gameId: room.gameId,
      party: room.getPublicMembers(),
    };
    // TODO: only send settings that hhave changed from the default upon room join for optimisation
    if (!room.isDefaultSettings) {
      data.settings = room.roomSettings;
    }
    player.socket.send(this.toJson(data));
    // inform the other players that a new member joined
    this.playerHasJoined(room, player);
  }
  // # PlayerHasJoined

  /**
   * Event to inform all the clients in the room except the joined player that a new member has joined the room
   * @param room the room object that was joined
   * @param player the Player object that has joined the room
   */
  private playerHasJoined(room: Room, player: Player): void {
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
   * @param newLaederId the id of the new room leader, if any.
   */
  public playerHasDisconnected(
    room: Room,
    player: Player,
    newLaederId: string | null
  ): void {
    //
    const data: Message = {
      event: "playerLeftParty",
      playerId: player.id,
    };
    // send the new leader id if it was passed
    if (newLaederId) {
      data.newLeaderId = newLaederId;
    }
    this.toAllButOne(room, player.id, data);
  }
  /**
   * Event to inform all the clients in the room except the leader, that settings have been updated.
   * @param room the room object
   * @param player the leader object
   * @param data data to be sent. It should be an object containing the setting id and the new value
   */
  public updatedSettings(
    room: Room,
    player: Player,
    data: { sid: number; value: number }
  ): void {
    const sendData: Message = {
      event: "settingsUpdated",
      ...data,
    };
    this.toAllButOne(room, player.id, sendData);
  }
}
