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
  protected _id: string;
  protected _gameId: number;
  protected _createdAt: number;
  protected _currentPlayerId: string;
  protected _createdBy: Player;
  protected _leaderId: string;
  protected _maxSlots: number;
  protected _currentRound = 1;
  protected _isLobby = true;
  protected _hasStarted = false;
  protected _members: Map<string, Player> = new Map();
  // room default settings
  protected settings = { ...defaultRoomSettings }; // timePerRound, difficulty, roundCount

  // private ;
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
    return this.settings;
  }

  get hasGameStarted(): boolean {
    return this._hasStarted;
  }

  /**
   * Used to decide whether to send the joined player the room settings or not. If the settings have not been changed, there is no need to send them to the client
   * @return true if the room settings match the default values. False if they have been changed.
   */
  get isDefaultSettings(): boolean {
    return (
      this.settings.roundCount === defaultRoomSettings.roundCount && // n of rounds
      this.settings.difficulty === defaultRoomSettings.difficulty && // difficulty
      this.settings.timePerRound === defaultRoomSettings.timePerRound // time per round
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
        this.settings.difficulty = valueId;
        // resolve
        resolve({ sid, value: valueId });
      } else if (sid == 2) {
        const roundCount = roundCountSettings.find((entry) => entry.id == valueId);
        if (roundCount) {
          this.settings.roundCount = roundCount.value;
          // resolve
          resolve({ sid, value: roundCount.value });
        } else reject();
      } else {
        const timePerRound = timePerRoundSettings.find((entry) => entry.id == valueId);
        if (timePerRound) {
          this.settings.timePerRound = timePerRound.value;
          // resolve
          resolve({ sid, value: timePerRound.value });
        } else reject();
      }
    });
  }

  /**
   * Get the members of the room that are intented to be sent to the client
   */
  public getPublicMembers(): PublicMembers {
    const publicMembers: PublicMembers = {};
    this.members.forEach((member, playerIdKey) => {
      publicMembers[playerIdKey] = member.getAsPublicMember;
    });
    return publicMembers;
  }
}
