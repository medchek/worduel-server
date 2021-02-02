import { Shuffler } from "./games/Shuffler";
import { nanoid } from "nanoid";
import { Player } from "./Player";
import { PlayerManager } from "./PlayerManager";
import { Room, RoomOptions } from "./Room";

// validation
import toInt from "validator/lib/toInt";
import { Kernel } from "./Kernel";
// used to

interface RoomListOptions {
  allowSameIp?: boolean;
}

interface CreateRoomOptions {
  requestedBy: Player;
  gameId: number | string;
}

interface JoinRoomOptions {
  roomId: string;
  requestedBy: Player;
}
/**
 * Class responsible for rooms creation and management.
 */
export class RoomManager extends Kernel {
  private roomList: Map<string, Room> = new Map();
  private playerList!: PlayerManager;
  private ipInsideRoom: Set<string> = new Set(); // tracks the ips that are in rooms
  private allowSameIp = false;

  constructor(options?: RoomListOptions) {
    super();
    // whether to allow the same ip to join or create multiple rooms
    if (options) {
      this.allowSameIp = options.allowSameIp || false;
    }
  }

  /**
   * !!! This method MUST be called before using any of the other class methods.
   *
   * This will allow this class to interact with the players manager thus making it very flexible.
   * @param playerList the player list that the room manager needs to interact with
   */
  attcahPlayerList(playerList: PlayerManager): void {
    this.playerList = playerList;
  }

  /**
   * get the room object that matches the given id
   * @param roomId the room id
   */
  getRoom(roomId: string): Room | undefined {
    return this.roomList.get(roomId);
  }

  /**
   * Check if the room exists
   * @param roomId the room id
   */
  hasRoom(roomId: string): boolean {
    return this.roomList.has(roomId);
  }
  /**
   * Add the room into the room list
   * @param roomId the room id
   * @param gameRoom The room object, or any that extends the Room class
   */
  addRoom(roomId: string, gameRoom: Room): void {
    this.roomList.set(roomId, gameRoom);
  }

  /**
   * creates a new room based on the data provided in the options
   * @param options CreateRoomOptions interface
   * @returns Promise - on success, returns the created room objcet.
   * On error, the promise rejects with an error object containing an error code and the duration the users should be blocked for
   */
  createNewRoom(options: CreateRoomOptions): Promise<Room> {
    return new Promise((resolve, reject) => {
      const { requestedBy, gameId } = options;
      // generate a random unique room id
      const roomId = nanoid();
      // check if the player hasnt already created/joined a room,
      // TODO: CHECK FOR IP IF IT HAS CREATED/JOINED ROOM
      const createRoomOptions: RoomOptions = {
        requestedBy: requestedBy,
        gameId: typeof gameId === "string" ? toInt(gameId) : gameId,
        id: roomId,
      };
      // load the game class that according to the gameId
      // where 1: Shuffler, 2: ToBeImplemented...etc
      if (gameId === 1) {
        const gameRoom = new Shuffler(createRoomOptions);
        this.addRoom(roomId, gameRoom);
        // also set it as leader since the client is the creator of the room
        requestedBy.setAsLeader();
        resolve(gameRoom);
      } else {
        // if the gameId is not allowed/recognzied,
        console.error(new Error("RoomManager.createNewRoom() => Invalid gameId"));
        // = REJECT
        reject({
          code: 101,
          blockSec: 3660,
        });
        return;
      }
    });
  }
  /**
   * Add the player to the room that matches the provided room id
   * @param options JoinRoomOptions interface
   * @returns Promise resolve: on success, returns the created room object
   * @returns Promsie rejcet: On error (non existant room, full room), the promise rejects with an error object containing an error code and the duration the users should be blocked for
   */
  joinRoom(options: JoinRoomOptions): Promise<Room> {
    return new Promise((resolve, reject) => {
      const { roomId, requestedBy } = options;
      const room = this.roomList.get(roomId);
      // if the the requested Socket is not part of any room and the room itself exists
      if (room) {
        if (!room.isFull) {
          // Add the player to the room members
          room.addMember(requestedBy, room.id);
          // # RESOLVE
          resolve(room);
        } else {
          // if room is full
          console.error(new Error("RoomManager.joinRoom() => Room is full"));
          // = REJECT
          return reject({ code: 403, blockSec: 3600 });
        }
      } else {
        console.error(new Error("RoomManager.joinRoom() => Room does not exist"));
        // = REJECT
        reject({
          code: 404,
          blockSec: 0,
        });
      }
    });
  }
  /**
   * Remove a room from the list. Also disconnect and remove all the remaining players in that room.
   * @param roomId id of the room to be removed
   */
  private removeRoom(roomId: string): boolean {
    let removed = false;
    const targetRoom = this.getRoom(roomId);
    // disconenct and remove all players if there are any
    if (targetRoom) {
      if (!targetRoom.isEmpty) {
        targetRoom.members.forEach((player) => {
          player.disconnect();
        });
        targetRoom.clearMembers();
      }
      if (targetRoom.hasGameStarted) targetRoom.endGame();
      // remove the room
      removed = this.roomList.delete(roomId);
      console.log(`room "${targetRoom.id}" deleted = ${removed}`);
    }
    return removed;
  }

  /**
   * - Remove the room if empty after the player disconnects.
   * - if not, remove only the player (also, set a new room leader if the player who disconnected was the leader).
   */
  public handleRoomRemoval(player: Player): void {
    if (player.joinedRoomId) {
      let newLeaderId: string | null = null;
      const room = this.getRoom(player.joinedRoomId);
      if (room) {
        // room is not empty at this point since the disconnected player has not been removed from the member list yet
        // there fore check there is only one player in the room at the moment the player disconnects and remove the room if so
        if (room.memberCount == 1) {
          this.removeRoom(player.joinedRoomId);
        } else {
          // otherwise, remove only the player that left from the room members
          //if the disconnected player was the creator of the room, pass the leadership to the next member of the room
          if (room.memberCount > 1 && player.isLeader) {
            const newLeader = room.setNewRoomLeader();
            // in case the room creator disconnected, send the new room leader id along with the response to the client
            newLeaderId = newLeader.id;
            // console.log("after=> ", newLeader);
          }
          // delte the player from the room members
          room.members.delete(player.id);
        }
        // delete the player from the playerList as well
        this.playerList.removePlayer({ id: player.id, terminateSocket: true });
        this.eventDispatcher.playerHasDisconnected(room, player, newLeaderId);
      }
    }
  }
}
