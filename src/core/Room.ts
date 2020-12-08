import { Player } from "./Player";

export interface RoomOptions {
  maxSlots?: number;
  roundCount?: number;
  gameId: number;
  id: string;
  createdBy: Player;
}

export abstract class Room {
  protected _id: string;
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
  protected _members: Set<Player> = new Set();

  // private ;
  constructor(roomOptions: RoomOptions) {
    const { maxSlots, id, roundCount, createdBy } = roomOptions;

    this._maxSlots = maxSlots || 6;
    this._roundCount = roundCount || 3;
    this._createdAt = Date.now();
    this._currentPlayerId = createdBy.id;
    this._id = id;
    this._leaderId = createdBy.id;
    this._createdBy = createdBy;

    // ** add the room creator to the members of the room
    this.addMember(createdBy);
  }

  get id(): string {
    return this._id;
  }

  public addMember(player: Player): void {
    this._members.add(player);
  }

  public removeMember(player: Player): void {
    if (!this._members.delete(player)) {
      console.error("Room.removePlayer() => Could not find playerId");
    }
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
