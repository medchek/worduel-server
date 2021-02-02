import { EventDispatcher } from "./EventDispatcher";
import {
  defaultRoomSettings,
  RoomSettings,
  roundCountSettings,
  timePerRoundSettings,
} from "./../config/roomSettings";
import { Player, PublicMember } from "./Player";

export interface RoomOptions {
  maxSlots?: number;
  gameId: number;
  id: string;
  requestedBy: Player;
}
export interface PublicMembers {
  [id: string]: PublicMember;
}

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
  /** round phases. Used to inform the client which game component to load when joining an ongoing game
   * - 1 = new round / before timer start.
   * - 2 = timer started / round ongoing.
   * - 3 = timer stopped / round ended/ score announcing */
  protected _roundPhase = 1;
  protected _hasStarted = false;
  protected _gameEnded = false;
  protected _currentPlayerId: string;
  protected _currentRound = 0;
  protected _isLobby = true;
  protected _wordToGuess: string | undefined;
  /** Word used to help the player guess the wordToGuess */
  protected _hintWord: string | undefined;

  // timing
  protected _timer: NodeJS.Timeout | null = null;
  protected _timerStartedAt = 0;

  /** time between annoucing a round and starting the timer (in seconds) */
  protected _timeBeforeTimerStart = 4;
  protected _currentWord = "";

  /** The base score value that the first player who answers correctly should earn per round */
  protected _baseScore = 50;
  /** Amount to remove from the score calculation formula. The greater it is, the less points the player gets. Maxium is the number of players */
  protected _scoreSubtractor = 0;
  /**  the number of player who found the correct answer during a round. Used to end the round if all player have found the current answer before the timer runs out */
  protected _correctAnswerCount = 0;

  constructor(roomOptions: RoomOptions) {
    const { maxSlots, id, requestedBy: createdBy, gameId } = roomOptions;

    this._maxSlots = maxSlots || 6;
    this._createdAt = Date.now();
    this._currentPlayerId = createdBy.id;
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

  /** round phases. Used to inform the client which game component to load when joining an ongoing game
   * - 1 = new round / before timer start.
   * - 2 = timer started / round ongoing.
   * - 3 = timer stopped / round ended/ score announcing */
  get roundPhase(): number {
    return this._roundPhase;
  }

  /** retuns true if all players have found the answer, false oherwise */
  get hasAllAnswered(): boolean {
    return this._correctAnswerCount == this.memberCount;
  }

  /** Get the data of the members of the room that are intented to be sent to the client */
  get publicMembers(): PublicMembers {
    const publicMembers: PublicMembers = {};
    this.members.forEach((member, playerIdKey) => {
      publicMembers[playerIdKey] = member.getAsPublicMember;
    });
    return publicMembers;
  }

  /** Return the time remaining before the timer ends */
  get reminaingTime(): number {
    return (
      this._settings.timePerRound - Math.floor((Date.now() - this._timerStartedAt) / 1000)
    );
  }

  /** Return the score obtained by all the players during a round */
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
   * Sets the maximum number of player for this room
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
   * Sets the first avaible player as a new leader
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
        // therfore, set it directly as the setting value
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
      // if the game has already started, dont do anything
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
    // annonce the beginning of a new round
    this._dispatch.announceNewRound(this, word);
    // wait for the time before firing the timer
    await this.timeBeforeStartTimer();
    this.onRoundStart();
    // start the timer
    await this.startTimer();
    return Promise.resolve();
  }

  /**
   * Move to the next round. Ends the game if it was the last round when the method is called
   */
  protected nextRound(): void {
    // if the game ended, dont go any further
    if (this._gameEnded) return;

    console.log(`starting new round in room ${this.id}`);
    // if the timer is still going on stop it
    if (this._currentRound < this._settings.roundCount) {
      this._currentRound++;
      this.newRound();
    } else {
      this.endGame();
    }

    //
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
      // set the "round ongoibn"
      this._roundPhase = 2;
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
  /** Reset the round score for all the players in the room. Should be used at the end of the round. */
  public resetRoundScores(): void {
    this._members.forEach((player) => {
      player.resetRoundScore();
    });
  }

  /**
   * Manually stop the timer and end the round.
   * Intended to be used when all players have correctly answered before the round time runs out
   */
  public endRound(): void {
    this.stopTimer();
  }

  /**
   * Resets the state of the round.
   * - Reset player has found correct answer state used to send messages for only players that have found the answer
   * - Reset the score substractor used to calculate the sscore for each player who answers correctly
   * - Reset the round scores of the player that are logged to inform the players the score they earned
   * - Reset the correct answer counter needed to tell whether to stop the round if all players have answered before the time ends
   * - Rest the round phase back to the first one (default one)
   *
   */
  private resetRoundState(): void {
    this.resetAllPlayerHasAnswered();
    this.resetScoreSubtractor();
    this.resetRoundScores();
    // reset the number of correct answer found in the round that is used to stop the round
    // in case all the players have found correct answer
    this._correctAnswerCount = 0;
    // reset round phase back to its default
    this._roundPhase = 1;
  }
  /**
   * Stops the timer. Reset all the round state as well
   * @param endGame prevent going to the next when stopping the timer
   */
  protected stopTimer(endGame = false): void {
    if (!this._timer) return;
    // reset the value of timerStartedAt
    this._timerStartedAt = 0;
    if (this._timer) clearTimeout(this._timer);
    // nullify the timer
    this._timer = null;
    // execute the onROundEnd lifecycle after finishing the timer
    if (!endGame) this.onRoundEnd();
    // reset the state of players that have found the answer
    // this.resetRoundState();
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

  /** Allow players in this room to send messages/answers. Should be run at the begenning of the game*/
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
   * ROUND LIFECYCLES
   *
   */

  /**
   * First round lifecycle to be fired when moving the new round
   */
  protected abstract onBeforeRoundStart(): Promise<string>;
  /**
   * Round Lifecycle fired after after timeBeforeStartTimer has resolved and at the beginning of the timer
   * - Should contain game/round logic
   */
  protected abstract onRoundStart(): void;
  /**
   * Check the answer of the player
   * @resolve Resolves to a number.
   * - 0 = player input is acceptable but uncorrect.
   * - 1 = player input is acceptable and is correct.
   * - 2 = player has already find the answer and keeps sending more messages
   * @reject The promise rejects when the user input in unacceptable/unexpected
   */
  public abstract checkAnswer(player: Player, answer: string): Promise<number>;
  /**
   * Last round lifecycle. Fired after the time has ran out or when the timer is manually stopped
   */
  private async onRoundEnd(): Promise<void> {
    //
    this._roundPhase = 3;
    this._dispatch.announceRoundScores(this);
    await this.wait(5);
    this.nextRound();
  }
  /**
   * Time to wait between announcing the round and starting the timer.
   */
}
