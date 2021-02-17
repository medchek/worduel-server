import WebSocket from "ws";
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
  reason?: string; // error reason
}

interface JoiedMessage {
  event: "roomJoined";
  playerId: string;
  roomId: string;
  gameId: number;
  party: PublicMembers;
  settings?: RoomSettings;
  word?: string;
  roundPhase?: number;
  remainingTime?: number;
  round?: number;
  scores?: { [playerName: string]: number };
}

export interface MessageOptions {
  playerId?: string; // the player id who got the answer correctly
  player: Player;
  room: Room;
  message: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already aswered
}

interface ChatMessage {
  event: string;
  from: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already aswered
  message?: string;
  playerId?: string;
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
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(this.toJsonStr(data));
        }
      }
    });
  }
  /**
   * Send data to a specific player
   * @param player
   */
  private toPlayer(player: Player, data: Message) {
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(this.toJsonStr(data));
    }
  }

  /**
   * Send the event data to all the players in the given room
   * @param room the room object to send data to
   * @param data the data to be sent
   */
  private toAll(room: Room, data: Message): void {
    room.members.forEach((player) => {
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(this.toJsonStr(data));
      }
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
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(this.toJsonStr(data));
        }
      }
    });
  }

  /**
   * Send the event data to all the players that have not found the answer
   * @param room the room object to send data to
   * @param data the data to be sent
   */
  private toAllHasNotAnswered(room: Room, data: Message): void {
    room.members.forEach((player) => {
      if (!player.hasAnswered) {
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(this.toJsonStr(data));
        }
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
    const data: JoiedMessage = {
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
    // # if the game has started, include more data
    if (room.hasGameStarted) {
      //
      data.roundPhase = room.roundPhase;
      data.word = room.hintWord;
      data.round = room.currentRound;
      if (room.roundPhase == 2) {
        data.remainingTime = room.reminaingTime;
      }
      if (room.roundPhase == 3) {
        data.scores = room.playersRoundScore;
      }
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
    // this.toAllButOne(room, player.id, data);
    this.toAll(room, data);
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

  /**
   * Event to inform all the players in the room of a new player's turn
   * @param room the game room object
   * @param playerId the id of the player that is to play currently
   */
  public annouceTurn(room: Room, playerId: string): void {
    this.toAll(room, {
      event: "newTurn",
      playerId: playerId,
    });
  }

  public announcePlayerIsSelectingWord(room: Room, playerId: string): void {
    this.toAllButOne(room, playerId, {
      event: "selectingWord",
      playerId,
    });
  }
  // wordSelection: { id: number; word: string }[]

  /**
   * Event to inform all the clinets in the room of the scores obtained by all the players during a single round
   * @param room the game room object
   */
  public announceRoundScores(room: Room): void {
    //
    const data = { event: "score", scores: room.playersRoundScore };
    this.toAll(room, data);
  }
  /**
   *  Event to inform all the clinets in the room of the scores obtained by all the players during a single turn
   * @param room the game room object
   */
  public annouceTurnScores(room: Room): void {
    this.announceRoundScores(room);
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
   * @param options The message options. The message type option is espcially required in order to send
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
    // if the player has found the answer, send two separate events
    // one: to infrom all the players but the one who answered that x player has answered correctly
    // two: to infrom the player who just answered correctly of his successful answer
    if (type === 1) {
      // send a message informing the players who haven't gotten the answer yet that playerId has found the correct answer, excluding the answer (message)
      // the playerId is included to target the player within the party object and change the client state accordingly
      this.toAllButOne(room, player.id, { ...data, playerId: player.id });
      // send the player who got the answer correctly the message along with the correct answer
      this.toPlayer(player, { event: "correct", message });
    } else {
      // in other cases, include the message in the answer
      data.message = message;
      // if the type = has already answered
      if (type === 2) {
        // send only to the players that have already answered
        this.toAllHasAnswered(room, data);
      }
      // if it's a regular message
      if (type === 0) {
        // send to all the players
        this.toAll(room, data);
      }
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

  /**
   * Event to inform all the clients in the room that the game has ended
   * @param room the game room object
   */
  gameEnded(room: Room): void {
    this.toAll(room, {
      event: "gameEnded",
    });
  }

  /**
   * Dispatch an error message to a specific player
   * @param player the player object
   * @param reason error detail
   */
  errorToPlayer(player: Player, reason: string): void {
    this.toPlayer(player, {
      event: "error",
      reason,
    });
  }
  /**
   * Dispatch an error message to all player within a room
   * @param room the room object
   * @param reason error detail
   */
  errorToAll(room: Room, reason: string): void {
    this.toAll(room, {
      event: "error",
      reason,
    });
  }
}
