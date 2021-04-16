import { colorConsole } from "tracer";
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
  word?: string; // the hint word
  wordLen?: number; // hint word length for games that should no reveal the whole word letters
  wordList?: string[]; // word to guess that the current player can chose from
  scores?: { [playerName: string]: number }; // score announcer data
  reason?: string; // error reason
  playerName?: string;
  hint?: string; // a hint sentence/word/phrase the current player can send to other players for games that feature this option
}

interface JoinedMessage {
  event: "roomJoined";
  playerId: string;
  roomId: string;
  gameId: number;
  party: PublicMembers;
  settings?: RoomSettings;
  word?: string;
  phase?: number;
  remainingTime?: number;
  round?: number;
  scores?: { [playerName: string]: number };
}

export interface MessageOptions {
  playerId?: string; // the player id who got the answer correctly
  player: Player;
  room: Room;
  message: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already answered
}

interface ChatMessage {
  event: string;
  from: string;
  type: number; // the type of the message. 0 = regular. 1 = just found answer. 2 = already answered
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
    // FIXME FIXED : client also needs to receive current room settings (selected game, difficulty, round count...etc)
    // FIXME FIXED : send remaining time, round n°, wordToGuess, scores, currentPlayer (when needed) if joining the game that is ongoing
    // which are yet to be implemented
    const data: JoinedMessage = {
      event: "roomJoined",
      playerId: player.id,
      roomId: room.id,
      gameId: room.gameId,
      party: room.publicMembers,
    };
    // TODO: only send settings that have changed from the default upon room join for optimization
    if (!room.isDefaultSettings) {
      data.settings = room.roomSettings;
    }
    // # if the game has started, include more data
    if (room.hasGameStarted) {
      //
      data.phase = room.phase;
      data.word = room.hintWord;
      data.round = room.currentRound;
      if (room.phase == 2) {
        data.remainingTime = room.remainingTime;
      }
      if (room.phase == 3) {
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
   * Event to inform all the clients in the room except the disconnected player that a member has left the room
   * @param room the room object that was joined
   * @param player the Player object that has joined the room
   * @param newLeaderId the id of the new room leader, if any.
   */
  public playerHasDisconnected(
    room: Room,
    player: Player,
    newLeaderId: string | null
  ): void {
    //
    const data: Message = {
      event: "playerLeftParty",
      playerId: player.id,
    };
    // send the new leader id if it was passed
    if (newLeaderId) {
      data.newLeaderId = newLeaderId;
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
   * @param word the word that helps the client to figure out the word to guess
   */
  public announceNewRound(room: Room, word?: string): void {
    colorConsole().debug("[DEBUG]: Announcing new round");

    // only send the word if the room does not feature a turn system
    // in which case the hint word is sent through the announceTurn event since a word must be sent for each turn
    const data: Message = {
      event: "newRound",
    };
    // only send the word if it's passed
    if (word) data.word = word;
    this.toAll(room, data);
  }

  /**
   * Event to inform all the players in the room of a new player's turn
   * @param room the game room object
   * @param playerId the id of the player who is to play currently
   */
  public announceNewTurn(room: Room, playerId: string): void {
    colorConsole().debug(`[DEBUG]: Announcing new turn. current playerid is ${playerId}`);
    this.toAll(room, {
      event: "newTurn",
      playerId,
    });
  }
  /**
   * Event to inform all the players but the current one to play that a players is picking up a word.
   * Also provides the current player with a word list from which a word can be selected as the current one to be guessed by the other players
   * @param room  the room object
   * @param player the current player's object
   * @param words a 3 words array that the current player can chose from as the word to guess of the current turn
   */
  public announcePlayerIsSelectingWord(
    room: Room,
    player: Player,
    wordList: string[]
  ): void {
    // DEVONLY check if this methods gets sent at the right time
    colorConsole().debug(
      `[DEBUG]: Announcing player [${player.username}] is selecting a word`
    );
    // send a first message to the players currently not playing informing them that the current player is picking up a word
    this.toAllButOne(room, player.id, {
      event: "wordSelect",
      // playerName: player.username, // ? this is not needed since it was sent in the announceNewTurn event
    });
    // send a message to the current playing player the word list from which to select a word to guess from
    this.toPlayer(player, {
      event: "wordSelect",
      wordList,
    });
  }
  // wordSelection: { id: number; word: string }[]

  /**
   * Event to inform all the clients in the room of the scores obtained by all the players during a single round
   * @param room the game room object
   */
  public announceRoundScores(room: Room): void {
    //
    const data = { event: "score", scores: room.playersRoundScore };
    this.toAll(room, data);
  }
  /**
   *  Event to inform all the clients in the room of the scores obtained by all the players during a single turn
   * @param room the game room object
   */
  public announceTurnScores(room: Room): void {
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
   * Event to dispatch the hint to other player in the room
   * @param player the player object who sent the hint
   * @param room the room object
   * @param hint the hint contents
   */
  public sendHint(player: Player, room: Room, hint: string): void {
    this.toAllButOne(room, player.id, {
      event: "hint",
      hint,
    });
  }

  /**
   * Event to send the word-to-guess length to all the players but the currently playing
   * @param room the room object
   * @param playerId the currenty player id whose turn is currently active
   */
  public sendWordToGuessLength(room: Room, playerId: string): void {
    if (!room.wordToGuess) throw new Error("sendWordToGuessLength => word not set yet");
    this.toAllButOne(room, playerId, {
      event: "wordLen",
      wordLen: room.wordToGuess.length,
    });
  }

  /**
   * Forward a message to the client chat
   * @param options The message options. The message type option is especially required in order to send
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
    // one: to inform all the players but the one who answered that x player has answered correctly
    // two: to inform the player who just answered correctly of his successful answer
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
