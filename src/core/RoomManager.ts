import { Shuffler } from "./games/Shuffler";
import { nanoid } from "nanoid";
import { Player } from "./Player";
import { PlayerManager } from "./PlayerManager";
import { Room, RoomOptions } from "./Room";

// validation
import toInt from "validator/lib/toInt";
// used to

interface RoomListOptions {
  allowSameIp?: boolean;
}

interface CreateRoomOptions {
  maxSlots?: number;
  roundCount?: number;
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
export class RoomManager {
  private roomList: Map<string, Room> = new Map();
  private playerList!: PlayerManager;
  private ipInsideRoom: Set<string> = new Set(); // tracks the ips that are in rooms
  private allowSameIp = false;

  constructor(options?: RoomListOptions) {
    // whether to allow the same ip to join or create multiple rooms
    if (options) {
      this.allowSameIp = options.allowSameIp || false;
    }
  }

  /**
   * !!! This method MUST be called before using any of the other class methods
   * @param playerList the player list that the room manager needs to interact with
   */
  attcahPlayerList(playerList: PlayerManager): void {
    this.playerList = playerList;
  }

  getRoom(roomId: string): Room | undefined {
    return this.roomList.get(roomId);
  }

  hasRoom(roomId: string): boolean {
    return this.roomList.has(roomId);
  }
  /**
   * creates a new room based on the data provided in the options
   * @param options CreateRoomOptions interface
   * @returns Promise - on success, returns the created room id.
   * On error, the promise rejects with an error object containing an error code and the duration the users should be blocked for
   */
  createNewRoom(options: CreateRoomOptions): Promise<Room> {
    return new Promise((resolve, reject) => {
      const { requestedBy, gameId, maxSlots, roundCount } = options;
      // generate a random unique room id
      const roomId = nanoid();
      // check if the player hasnt already created/joined a room,
      // TODO: CHECK FOR IP IF IT HAS CREATED/JOINED ROOM
      if (!requestedBy.joinedRoomId) {
        const createRoomOptions: RoomOptions = {
          requestedBy: requestedBy,
          gameId: typeof gameId === "string" ? toInt(gameId) : gameId,
          id: roomId,
          roundCount,
          maxSlots,
        };
        // load the game class that according to the gameId
        // where 1: Shuffler, 2: ToBeImplemented...etc
        if (gameId === 1) {
          const gameRoom = new Shuffler(createRoomOptions);
          this.roomList.set(roomId, gameRoom);
          // set the player as having joined a room so as to prevent any further room join or create
          requestedBy.setPlayerJoinedRoom(roomId);
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

        // # RESOLVE
      } else {
        console.error(
          new Error("RoomManager.createNewRoom() => Player is already in a Room")
        );
        // = REJECT
        reject({
          code: 102,
          blokSec: 0,
        });
        return;
      }
    });
  }

  joinRoom(options: JoinRoomOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const { roomId, requestedBy } = options;
      const room = this.roomList.get(roomId);
      // if the the requested Socket is not part of any room and the room itself exists
      if (!requestedBy.joinedRoomId && room) {
        // Add the player to the room members
        room.addMember(requestedBy);
        // set the player as having joined a room so as to prevent any further room join or create
        requestedBy.setPlayerJoinedRoom(room.id);
        // # RESOLVE
        resolve(true);
      } else {
        console.error(
          new Error(
            "RoomManager.joinRoom() => Player is already in a Room or Room does not exist"
          )
        );
        // = REJECT
        reject({
          code: 103,
          blockSec: 0,
        });
      }
    });
  }
}
