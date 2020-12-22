import { Member, Player } from "./Player";

export interface RoomOptions {
  maxSlots?: number;
  roundCount?: number;
  gameId: number;
  id: string;
  requestedBy: Player;
}

export abstract class Room {
  protected _id: string;
  protected _gameId: number;
  protected _createdAt: number;
  protected _currentPlayerId: string;
  protected _createdBy: Player;
  protected _leaderId: string;
  protected _maxSlots;
  protected _currentRound = 1;
  protected _roundCount;
  protected _timePerRound = 90;
  protected _isLobby = true;
  protected _difficulty = 1;
  protected _members: Map<string, Member> = new Map();

  // private ;
  constructor(roomOptions: RoomOptions) {
    const { maxSlots, id, roundCount, requestedBy: createdBy, gameId } = roomOptions;

    this._maxSlots = maxSlots || 6;
    this._roundCount = roundCount || 3;
    this._createdAt = Date.now();
    this._currentPlayerId = createdBy.id;
    this._id = id;
    this._gameId = gameId;
    this._leaderId = createdBy.id;
    this._createdBy = createdBy;

    // ** add the room creator to the members of the room
    this.addMember(createdBy);
  }

  get id(): string {
    return this._id;
  }

  get gameId(): number {
    return this._gameId;
  }

  get members(): Map<string, Member> {
    return this._members;
  }

  get maxSlots(): number {
    return this._maxSlots;
  }

  get isFull(): boolean {
    // if the number of the members in the room is great or equal
    return this._members.size >= this._maxSlots;
  }

  public addMember(player: Player): void {
    this._members.set(player.id, player.asMember);
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
}
