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
  word?: string;
  scores?: { [playerName: string]: number }; // score announcer data
}

export interface MessageOptions {
  player: Player;
  room: Room;
  message?: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already aswered
}

interface ChatMessage {
  event: string;
  from: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already aswered
  message?: string;
}

export class EventDispatcher {
  private toJsonStr(json: Message): string {
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
        player.socket.send(this.toJsonStr(data));
      }
    });
  }
  /**
   * Send data to a specific player
   * @param player
   */
  private toPlayer(player: Player, data: Message) {
    player.socket.send(this.toJsonStr(data));
  }

  /**
   * Send the event data to all the players in the given room
   * @param room the room object to send data to
   * @param data the data to be sent
   */
  private toAll(room: Room, data: Message): void {
    room.members.forEach((player) => {
      player.socket.send(this.toJsonStr(data));
    });
  }
  /**
   * Send the event data to all the players that have correctly answered
   * @param room the room object to send data to
   * @param data the data to be sent
   */
  private toAllHasAnswered(room: Room, data: Message): void {
    room.members.forEach((player) => {
      if (player.hasAnswered) {
        player.socket.send(this.toJsonStr(data));
      }
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
      this.toJsonStr({
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
    // FIXME send remaining time, round n°, wordToGuess, scores, currentPlayer (when needed) if joining the game that is ongoing
    // which are yet to be implemented
    const data: Message = {
      event: "roomJoined",
      playerId: player.id,
      roomId: room.id,
      gameId: room.gameId,
      party: room.publicMembers,
    };
    // TODO: only send settings that hhave changed from the default upon room join for optimisation
    if (!room.isDefaultSettings) {
      data.settings = room.roomSettings;
    }
    player.socket.send(this.toJsonStr(data));
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

  /**
   * Event to inform all the clients in the room that the game has started
   * @param room the room object
   */
  public gameStarted(room: Room): void {
    this.toAll(room, { event: "start" });
  }

  /**
   * Event to inform all the players than a new round is about to start
   * @param room the game room object
   * @param word the word that helps send to the client
   */
  public announceNewRound(room: Room, word: string): void {
    this.toAll(room, {
      event: "newRound",
      word,
    });
  }

  public announceRoundScores(room: Room): void {
    //
    const data = { event: "scores", scores: room.playersRoundScore };
    this.toAll(room, data);
  }

  /**
   * Event to inform the client that the timer has started
   * @param room the game room object
   */
  public timerStarted(room: Room): void {
    this.toAll(room, {
      event: "timerStarted",
    });
  }

  /**
   * Forward a message to the client chat
   * @param options The message options. The type option is espcially required to be able to send
   * the message to either all the clients in the chat or only the ones who have already found the correct answer.
   */
  public sendChatMessage(options: MessageOptions): void {
    const { player, room, type, message } = options;
    if (!player.username) return;
    const data: ChatMessage = {
      event: "message",
      type,
      from: player.username,
    };
    // only send the message if necessary
    if (message) data.message = message;
    // if the type = has already answered
    if (type === 2) {
      // send only to the players that have already answered
      this.toAllHasAnswered(room, data);
    } else {
      // send to all the players
      this.toAll(room, data);
    }
  }
  /**
   * Event to inform the client to slow down from sending too many messages
   * @param player the player object
   */
  public slowDown(player: Player): void {
    if (!player.ip) return;
    this.toPlayer(player, {
      event: "slowDown",
    });
  }
}
