import { colorConsole } from "tracer";
import { EventDispatcher } from "./EventDispatcher";
import {
  defaultRoomSettings,
  RoomSettings,
  roundCountSettings,
  timePerRoundSettings,
} from "./../config/roomSettings";
import { Player, PublicMember } from "./Player";
import { randomNumber } from "./utils";

export interface RoomOptions {
  maxSlots?: number;
  gameId: number;
  id: string;
  requestedBy: Player;
}
export interface PublicMembers {
  [id: string]: PublicMember;
}

type PlayerId = string;

export abstract class Room {
  protected _dispatch = new EventDispatcher();

  protected _id: string;
  protected _gameId: number;
  protected _createdAt: number;
  protected _createdBy: Player;
  protected _leaderId: string;
  protected _maxSlots: number;
  protected _members: Map<string, Player> = new Map();
  // room default settings
  protected _settings = { ...defaultRoomSettings }; // timePerRound, difficulty, roundCount
  // ** GAME STATE
  /** game phases. Used to inform the client which game component to load when joining an ongoing game
   * - 1 = new round / before timer start.
   * - 1.1 = new turn / turn announcer (if game allows it)
   * - 1.2 = player word selection window (if game allows it)
   * - 2 = timer started / round ongoing.
   * - 3 = timer stopped / turn ended / turn score announcing
   * - 4 = timer stopped / round ended/ round score announcing */
  protected _phase = 1;
  /** Whether the game features a turn system where each player gets to play once per round */
  protected abstract _hasTurns: boolean;
  /** When hasTurn is true this, can be set to allow players to select a word among three when their turn comes  */
  // protected abstract _hasToSelectWord: boolean;
  protected _hasStarted = false;
  protected _gameEnded = false;
  protected _currentPlayerIndex: number | null = null;
  protected _currentTurn = 0;
  protected _currentRound = 0;
  protected _isLobby = true;
  protected _wordToGuess: string | undefined;
  /** The generated words that the current player can select a word from to be guessed by the other players in the room */
  protected _wordsToSelectFrom: string[] = [];
  /** Word used to help the player guess the wordToGuess */
  protected _hintWord: string | undefined;

  // timing
  protected _timer: NodeJS.Timeout | null = null;
  protected _timerStartedAt = 0;

  /** Used to store the timeout for the waitBeforeStop function */
  protected _sleep: NodeJS.Timeout | null = null;

  /** time between announcing a round and starting the timer (in seconds) */
  protected _timeBeforeTimerStart = 4;
  // private _currentWord = "";

  /** The base score value that the first player who answers correctly should earn per round */
  protected _baseScore = 50;
  /** Amount to remove from the score calculation formula. The greater it is, the less points the player gets. Maximum is the number of players */
  protected _scoreSubtractor = 0;
  /**  the number of player who found the correct answer during a round. Used to end the round if all player have found the current answer before the timer runs out */
  protected _correctAnswerCount = 0;

  constructor(roomOptions: RoomOptions) {
    const { maxSlots, id, requestedBy: createdBy, gameId } = roomOptions;

    this._maxSlots = maxSlots || 6;
    this._createdAt = Date.now();
    // this._currentPlayerId = createdBy.id;
    this._id = id;
    this._gameId = gameId;
    this._leaderId = createdBy.id;
    this._createdBy = createdBy;

    // ** add the room creator to the members of the room
    this.addMember(createdBy, id);
  }

  get id(): string {
    return this._id;
  }

  get gameId(): number {
    return this._gameId;
  }

  get members(): Map<string, Player> {
    return this._members;
  }

  get maxSlots(): number {
    return this._maxSlots;
  }

  get isFull(): boolean {
    // if the number of the members in the room is great or equal
    return this._members.size >= this._maxSlots;
  }

  get isEmpty(): boolean {
    return this._members.size === 0;
  }

  get memberCount(): number {
    return this._members.size;
  }

  get roomSettings(): RoomSettings {
    return this._settings;
  }

  get hasGameStarted(): boolean {
    return this._hasStarted;
  }

  get wordToGuess(): string | undefined {
    return this._wordToGuess;
  }

  get currentRound(): number {
    return this._currentRound;
  }

  get hintWord(): string | undefined {
    return this._hintWord;
  }

  get hasTurns(): boolean {
    return this._hasTurns;
  }

  /** round phases. Used to inform the client which game component to load when joining an ongoing game
   * - 1 = new round / before timer start.
   * - 1.1 = turn announcer (if game allows it)
   * - 1.2 = player word selection window (if game allows it)
   * - 2 = timer started / round ongoing.
   * - 3 = timer stopped / turn ended / turn score announcing
   * - 4 = timer stopped / round ended/ score announcing */
  get phase(): number {
    return this._phase;
  }

  get isLastTurn(): boolean {
    if (!this._currentPlayerIndex) return false;
    if (this._currentPlayerIndex + 1 === this.memberCount) {
      return true;
    } else return false;
  }

  /**
   * Returns the currently playing player object in a game that features turns
   */
  get turnCurrentPlayer(): Player | null {
    if (!this._hasTurns) throw new Error("This game does not feature a turn system");
    if (this._currentPlayerIndex === null) return null;
    const party = Array.from(this._members);
    return party[this._currentPlayerIndex][1];
  }

  get isLastRound(): boolean {
    return this._currentRound == this._settings.roundCount;
  }

  /** returns true if all players have found the answer, false otherwise */
  get hasAllAnswered(): boolean {
    // if the game has features turns, the number of correct answer should be take into account the currently player memeber
    // who does not answer
    if (this.hasTurns) {
      return this._correctAnswerCount == this.memberCount - 1;
    } else {
      return this._correctAnswerCount == this.memberCount;
    }
  }

  /** Get the data of the members of the room that are intended to be sent to the client */
  get publicMembers(): PublicMembers {
    const publicMembers: PublicMembers = {};
    this.members.forEach((member, playerIdKey) => {
      publicMembers[playerIdKey] = member.getAsPublicMember;
    });
    return publicMembers;
  }

  /** Return the time remaining before the timer ends */
  get remainingTime(): number {
    return (
      this._settings.timePerRound - Math.floor((Date.now() - this._timerStartedAt) / 1000)
    );
  }

  /** Return the score obtained by all the players during a round/turn */
  get playersRoundScore(): { [playerName: string]: number } {
    const playersScore: { [playerName: string]: number } = {};
    this._members.forEach((player) => {
      playersScore[player.id] = player.roundScore;
    });
    return playersScore;
  }

  /**
   * Used to decide whether to send the joined player the room settings or not. If the settings have not been changed, there is no need to send them to the client
   * @return true if the room settings match the default values. False if they have been changed.
   */
  get isDefaultSettings(): boolean {
    return (
      this._settings.roundCount === defaultRoomSettings.roundCount && // n of rounds
      this._settings.difficulty === defaultRoomSettings.difficulty && // difficulty
      this._settings.timePerRound === defaultRoomSettings.timePerRound // time per round
    );
  }

  public addMember(player: Player, joinedRoomId: string): void {
    // set the player as having joined a room so as to prevent any further room join or create
    player.setJoinedRoomId(joinedRoomId);
    this._members.set(player.id, player);
  }

  public removeMember(playerId: string): boolean {
    return this._members.delete(playerId);
  }

  public getMember(playerId: string): Player | undefined {
    return this._members.get(playerId);
  }

  public clearMembers(): void {
    this._members.clear();
  }

  /**
   * Informs all the client in the room that the game has started.
   *
   */
  protected setGameHasStarted(): void {
    this._hasStarted = true;
    this._isLobby = false;
  }

  protected setWordToGuess(word: string): void {
    this._wordToGuess = word;
  }

  protected setHintWord(word: string): void {
    this._hintWord = word;
  }

  /**
   * Sets the maximum number of players for this room
   * @param max Max number of players that can join the room. Between 2 and 10 max players
   */
  protected setMaxSlot(max: number): void {
    if (max > 1 && max <= 10) {
      this._maxSlots = max;
    } else {
      console.error("Room.setMaxSlot() => invalid max value");
    }
  }

  /**
   * Sets the first available player as a new leader
   * @return new leader Player object
   */
  public setNewRoomLeader(): Player {
    const iterator = this._members.values();
    // skip the first player which should always be the leader
    iterator.next();
    // get the first available member
    const newLeader: Player = iterator.next().value;
    // set it as the new leader
    newLeader.setAsLeader();
    return newLeader;
  }
  /**
   * set the room settings
   * @param sid setting id
   * @param id the id of the value
   */
  public setRoomSettings(
    sid: number,
    valueId: number
  ): Promise<{ sid: number; value: number }> {
    return new Promise((resolve, reject) => {
      if (sid == 1) {
        // the difficulty will be computed according to the id not the string value
        // therefore, set it directly as the setting value
        this._settings.difficulty = valueId;
        // resolve
        resolve({ sid, value: valueId });
      } else if (sid == 2) {
        const roundCount = roundCountSettings.find((entry) => entry.id == valueId);
        if (roundCount) {
          this._settings.roundCount = roundCount.value;
          // resolve
          resolve({ sid, value: roundCount.value });
        } else reject();
      } else {
        const timePerRound = timePerRoundSettings.find((entry) => entry.id == valueId);
        if (timePerRound) {
          this._settings.timePerRound = timePerRound.value;
          // resolve
          resolve({ sid, value: timePerRound.value });
        } else reject();
      }
    });
  }

  /**
   * Sets the next player to play and return the id of said player
   * @returns player's id for the current turn
   */
  protected setNextPlayerTurn(): PlayerId {
    if (!this._hasTurns) throw new Error("This game does not feature a turn system");
    const members = Array.from(this._members);

    colorConsole().debug("MOVING TO NEXT PLAYER");

    if (this._currentPlayerIndex === null) {
      this._currentPlayerIndex = 0;
      // item at the 1 index is the player object
      members[this._currentPlayerIndex][1].setIsTurn();
      // return the first player, with the item at 0 index being the playerId (the map key)
      return members[0][0];
    } else {
      // otherwise, move to the next player
      this._currentPlayerIndex++;
      members[this._currentPlayerIndex][1].setIsTurn();
      // and return his id
      return members[this._currentPlayerIndex][0];
    }
  }

  /**
   * SECTION GAME & ROUND MANAGEMENT
   */

  /**
   * Start the game
   */
  public startGame(): void {
    console.info(`Starting the game in room ${this.id}`);

    // FIXME LATENCY EMULATOR
    setTimeout(() => {
      //-----------
      // if the game has already started, don't do anything
      if (this.hasGameStarted) {
        console.warn(`Game in room ${this.id} has already started`);
        return;
      }
      this.setGameHasStarted();
      // allow players to send messages only if the game has just started
      this.allowAnswers();
      // inform all the client that the game started
      this._dispatch.gameStarted(this);
      // start the first round
      this.nextRound();
      //-----------
    }, 1000);
    //--------------
  }
  /**
   * Time to wait between announcing the round and kicking off the timer
   */
  private timeBeforeStartTimer(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, this._timeBeforeTimerStart * 1000);
    });
  }

  /**
   * A timer to wait before executing subsequent code.
   */
  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }
  /**
   * A timer to wait before executing subsequent code.
   * - This function stores the timeout in memory to be able to stop it at any time using the stopWaiting function
   * @param seconds the number of seconds to sleep for
   * @param fn an optional function to execute at the end of the timer
   */
  private await(seconds: number, fn?: () => void): Promise<void> {
    return new Promise((resolve) => {
      this._sleep = setTimeout(() => {
        if (fn) fn();
        this.stopWaiting();
        resolve();
      }, seconds * 1000);
    });
  }
  /** Stop the sleep time and resets it
   * @param fn an optional function to execute at the end of the timer
   */
  private stopWaiting(fn?: () => void): void {
    if (this._sleep) clearTimeout(this._sleep);
    if (fn) fn();
    this._sleep = null;
  }

  /**
   * Runs a complete round lifecycle
   */
  private async newRound(): Promise<void> {
    if (this._gameEnded) return;
    // reset the state of players that have found the answer
    this.resetRoundState();
    // // set the first phase of the round
    // // this._roundPhase = 1;
    // stops the timer if it's started
    this.stopTimer();
    // logic to run before announcing the round
    const word = await this.onBeforeRoundStart();
    // announce the beginning of a new round
    this._dispatch.announceNewRound(this, word);
    // wait for the time before firing the timer
    // await this.timeBeforeStartTimer();
    await this.wait(this._timeBeforeTimerStart);
    // this.onRoundStart();
    // start the timer
    await this.startTimer();
    return Promise.resolve();
  }
  /** Runs a complete round lifecycle including turns for each player */
  private async newRoundWithTurns(): Promise<void> {
    if (this._gameEnded) return;
    // reset the round state when moving to a new one
    if (this._currentRound > 1) this.resetRoundState();
    // announce a new round
    this._dispatch.announceNewRound(this);
    // wait before announcing the new turn
    await this.wait(3);
    // wait for a full turn cycle
    await this.newTurn();
  }

  /** Runs a complete turn cycle */
  private async newTurn(): Promise<void> {
    this.resetTurnState();
    this.stopTimer(); // stop the timer if it's still running
    this._wordsToSelectFrom = this.onBeforeTurnStart();
    const currentPlayerId = this.setNextPlayerTurn();
    const player = this.getMember(currentPlayerId);
    colorConsole().debug(`[newTurn] => current turn's player is ${player?.username}`);
    if (!player) throw colorConsole().error("newTurn() => couldn't find next player");
    // move to the new turn phase
    this._phase = 1.1;
    // announce it to the players
    this._dispatch.announceNewTurn(this, currentPlayerId);
    await this.wait(3);
    // allow the current player to select a word
    player.setCanSelectWord();
    // inform all the players of the word selection phase
    this._dispatch.announcePlayerIsSelectingWord(this, player, this._wordsToSelectFrom);
    // move to word selection phase
    this._phase = 1.2;
    // give the player some time to select after which select a word automatically
    // if the player does not select a word after the waiting time has ran out, select a word automatically among the three random one in the words array
    await this.await(10, () => this.playerHasSelectedWord(player, randomNumber(2)));
    // NOTE: if the client choses a word before the selection time window runs out, the timer is kicked off from another method
  }
  /**
   * Used when the player selects a word before the automatic selector is kicked off.
   * This method will fire the timer.
   * @param player the current player's object
   * @param wordIndex the selected word index
   */
  public playerHasSelectedWord(player: Player, wordIndex: number): void {
    this.stopWaiting();
    // disallow any further word selection by the player
    player.setCanSelectWord(false);
    // set the word to guess based on the received word index
    this._wordToGuess = this._wordsToSelectFrom[wordIndex];
    // dispatch the word length as a hint to other players
    this._dispatch.sendWordToGuessLength(this, player.id); // kick off the timer
    //
    this.startTimer();
  }
  /**
   * Move to the next round. Ends the game if it was the last round when the method is called
   */
  protected nextRound(): void {
    // if the game ended, don't go any further
    if (this._gameEnded) return;

    console.log(`starting new round in room ${this.id}`);
    // if the timer is still going on stop it
    if (this._currentRound < this._settings.roundCount) {
      this._currentRound++;
      // if the game does not feature a turn system, move to a regular round directly
      if (!this._hasTurns) {
        this.newRound();
      } else {
        // otherwise, move to a round with turns
        this.newRoundWithTurns();
      }
    } else {
      this.endGame();
    }
  }
  /** Move to the next turn. If the turn was the last upon calling this methods, move to the next round instead which will then end the game if it is the last as well*/
  private nextTurn(): void {
    if (this._gameEnded) return;
    console.log(`going to next turn in room ${this.id}`);
    if (!this.isLastTurn) {
      this.newTurn();
    } else {
      this.nextRound();
    }
  }

  public endGame(): void {
    // if the game is not finished yet
    if (this._gameEnded) return console.warn("CANNOT END GAME. GAME ALREADY FINISHED");
    this._gameEnded = true;
    // stop the timer if not already stopped, and ask the stopTimer method not go to the next round
    if (this._timer !== null) this.stopTimer(true);
    // inform the players that the game has ended
    this._dispatch.gameEnded(this);
    console.log(`Game in room ${this.id} ended!`);
  }
  /**
   * Starts the round timer and announces it to all clients in the room.
   * When the time runs out, stops the timer and fire onRoundEnd() lifecycle
   */
  protected startTimer(): Promise<void> {
    return new Promise((resolve) => {
      // set the "round ongoing"
      this._phase = 2;
      this._timerStartedAt = Date.now();
      this._dispatch.timerStarted(this);
      this._timer = setTimeout(() => {
        // stop the timer and end the round after the time runs out
        this.stopTimer();
        resolve();
      }, this._settings.timePerRound * 1000);
    });
  }

  /** Calculates the score for the current player who has found the answer */
  public calculatePlayerScore(player: Player): number {
    //
    const percentage =
      (100 / this.memberCount) * (this.memberCount - this._scoreSubtractor);
    this._scoreSubtractor++;
    const score = Math.floor(this._baseScore * (percentage / 100));
    player.addScore(score);
    // add to the number of players that have found the correct answer per round
    this._correctAnswerCount++;
    return score;
  }
  /** Reset the score for all the players in the room. Should be used at the end of the round/turn. */
  public resetPlayersScores(): void {
    this._members.forEach((player) => {
      player.resetRoundScore();
    });
  }
  /**
   * Calculate the score of the currently playing pary member. Should be called on every turn end.
   *
   * Since the current player does not answer the question, the score obtained should be counted based on how many other players have answered.
   * The player should get a near-full score if everyone answered, and nothing if no one did.
   */
  public calculateTurnCurrentPlayerScore(): number {
    if (!this.hasTurns) throw new Error("game does not support a turn system");
    // get the score percentage based on the party length
    // eg: if 4 players out of 5 answered, the current player should obtain 80% of the initial base score
    const scoredPercentage = (this._correctAnswerCount * 100) / this.memberCount;
    // remove a small penalty to reward players who answered more
    const finalScore = (this._baseScore * scoredPercentage) / 100 - this.memberCount;
    return finalScore > 0 ? finalScore : 0;
  }

  /**
   * Manually stop the timer and end the round.
   * Intended to be used when all players have correctly answered before the round time runs out
   */
  public endRound(): void {
    this.stopTimer();
  }

  public endTurn(): void {
    this.stopTimer();
  }

  private resetSharedState(): void {
    this.resetAllPlayerHasAnswered();
    this.resetScoreSubtractor();
    this.resetPlayersScores();
    // reset the number of correct answer found in the round that is used to stop the round
    // in case all the players have found correct answer
    this._correctAnswerCount = 0;
  }
  /**
   * Resets the state of the round.
   * - Reset player has found correct answer state used to send messages for only players that have found the answer
   * - Reset the score subtractor used to calculate the score for each player who answers correctly
   * - Reset the round scores of the player that are logged to inform the players the score they earned
   * - Reset the correct answer counter needed to tell whether to stop the round if all players have answered before the time ends
   * - Reset the round phase back to the first one (default one)
   * - Reset the currentPlayerIndex form games that feature turn system
   */
  private resetRoundState(): void {
    this.resetSharedState();
    // reset round phase back to its default
    this._phase = 1;
    // reset the current player index to move back to the first player
    if (this._hasTurns) this._currentPlayerIndex = null;
  }

  private resetTurnState(): void {
    this.resetSharedState();
    this._phase = 1.1;
    this._wordsToSelectFrom = [];
  }

  /**
   * Stops the timer. Reset all the round state as well
   * @param endGame prevent going to the next turn/round when stopping the timer
   */
  protected stopTimer(endGame = false): void {
    if (!this._timer) return;
    // reset the value of timerStartedAt
    this._timerStartedAt = 0;
    if (this._timer) clearTimeout(this._timer);
    // nullify the timer
    this._timer = null;
    // # ADJUSTMENTS FOR THE TURN SYSTEM
    // ? If the game is turn based then move to the next turn instead of the round at the end, until all players have played their turn

    // execute the onRoundEnd lifecycle after finishing the timer
    if (!endGame) {
      if (this._hasTurns /** && !this.isLastTurn*/) {
        this.onTurnEnd();
      } else {
        this.onRoundEnd();
      }
    }
  }

  /** Reset the "player has found the answer" state to false for all the players that have found the answer. */
  protected resetAllPlayerHasAnswered(): void {
    this._members.forEach((player) => {
      if (player.hasAnswered) player.setHasAnswered(false);
      else return;
    });
  }

  /** Resets the score subtractor back to 0 */
  private resetScoreSubtractor() {
    this._scoreSubtractor = 0;
  }

  /**
   * Handle the hint reception event
   * @param player the player who sent the hint
   * @param hint the hint contents
   */
  hintReceived(player: Player, hint: string): void {
    // if the hint is the same as the word to guess, don't forward it
    if (hint == this.wordToGuess) return;
    this.setHintWord(hint);
    this._dispatch.sendHint(player, this, hint);
  }

  /** Allow players in this room to send messages/answers. Should be run at the beginning of the game*/
  allowAnswers(): void {
    this._members.forEach((player) => {
      if (!player.canSendMessages) player.setCanSendMessage();
    });
  }

  /** Disallow players in this room to send messages/answers. Should be run at the end of a game before disconnecting the players*/
  disallowAnswers(): void {
    this._members.forEach((player) => {
      if (player.canSendMessages) player.setCanSendMessage(false);
    });
  }

  /**
   *
   * ROUND LifeCycles
   *
   */

  /**
   * First round lifecycle to be fired when moving to a new round
   */
  protected abstract onBeforeRoundStart(): Promise<string>;

  protected abstract onBeforeTurnStart(): string[];

  // protected abstract onRoundStart(): void;
  /**
   * Check the answer of the player.
   * @resolve Resolves to a number.
   * - 0 = player input is acceptable but incorrect (should be treated as a regular chat message).
   * - 1 = player input is acceptable and is correct.
   * - 2 = player has already find the answer and keeps sending more messages
   * @reject The promise rejects when the user input in unacceptable/unexpected
   */
  public checkAnswer(player: Player, answer: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // if the word to guess is not set yet
      if (!this.wordToGuess) return reject("Error: wordToGuess is not set");
      // if the player has already found the answer and sends more messages while the round is still ongoing
      if (player.hasAnswered) return resolve(2);
      // if the word to guess length is not similar to the client answer
      if (this.wordToGuess.length === answer.length) {
        // if the answer is correct
        if (this.wordToGuess == answer.toLocaleLowerCase()) {
          // set the player as having found the correct answer
          // TODO reset playerHasFoundAnswer on round end
          resolve(1);
        } else resolve(0); // incorrect answer/ regular chat message
      } else {
        // player answer is incorrect
        resolve(0);
      }
    });
    //
  }

  /**
   * Last round lifecycle. Fired after the time has ran out or when the timer is manually stopped
   */
  private async onRoundEnd(): Promise<void> {
    //
    this._phase = 4;
    this._dispatch.announceRoundScores(this);
    await this.wait(4);
    this.nextRound();
  }

  private async onTurnEnd(): Promise<void> {
    if (this._gameEnded) return;
    // calculate the score of the player whose turn was in that turn
    if (this.turnCurrentPlayer) {
      this.turnCurrentPlayer.addScore(this.calculateTurnCurrentPlayerScore());
      // remove the turn state in preparation for the next turn
      this.turnCurrentPlayer.setIsTurn(false);
    }

    // go the the turn ended phase
    this._phase = 3;
    this._dispatch.announceTurnScores(this);
    await this.wait(4);
    this.nextTurn();
  }
}
