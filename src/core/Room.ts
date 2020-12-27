import { Player, PublicMember } from "./Player";

export interface RoomOptions {
  maxSlots?: number;
  roundCount?: number;
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
  protected _maxSlots;
  protected _currentRound = 1;
  protected _roundCount;
  protected _timePerRound = 90;
  protected _isLobby = true;
  protected _difficulty = 1;
  protected _members: Map<string, Player> = new Map();

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

  public addMember(player: Player, joinedRoomId: string): void {
    // set the player as having joined a room so as to prevent any further room join or create
    player.setPlayerJoinedRoom(joinedRoomId);
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

  public setNewRoomLeader(): void {
    const iterator = this._members.values();
    // get the first available member
    const newLeader: Player = iterator.next().value;
    // set it as the new leader
    newLeader.setAsLeader();
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
