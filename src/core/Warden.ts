import { colorConsole } from "tracer";
import { Player } from "./Player";
type IpAddress = string;
interface TrackerOptions {
  createdRooms: number;
  joinedRooms: number;
}
/**
 * TODO: IMPLEMENT IP TRAKCING TO PREVENT MULTIPLE ROOM CREATION BY THE SAME IP
 * This class should be used to handle the prevention of multiple room creation by the same ip
 */

export class Warden {
  private tracker: Map<IpAddress, TrackerOptions> = new Map();
  readonly maxCreate = 2; // maxium number of created rooms allowed per ip
  readonly maxJoin = 6; // max number of joined room allowed per ip

  private isCreateQuotaReached(ipTracker: TrackerOptions): boolean {
    return ipTracker.createdRooms == this.maxCreate;
  }

  private isJoinQuotaReached(ipTracker: TrackerOptions): boolean {
    return ipTracker.joinedRooms == this.maxJoin;
  }

  private decreaseCreatedQuota(trackerEntry: TrackerOptions): void {
    trackerEntry.createdRooms - 1 >= 0
      ? (trackerEntry.createdRooms -= 1)
      : (trackerEntry.createdRooms = 0);
  }

  private decreaseJoinedQuota(trackerEntry: TrackerOptions) {
    trackerEntry.joinedRooms - 1 >= 0
      ? (trackerEntry.joinedRooms -= 1)
      : (trackerEntry.joinedRooms = 0);
  }

  /**
   * Add an ip address to the tracker
   * @param ip the ip address to track
   * @param create boolean to specify whether the client is creating or joining a room (true or false respectively).
   * @returns true if the action was successfuly, false if the ip has exceeded its allowed quota
   */
  private track(ip: IpAddress, create: boolean): boolean {
    const ipEntry = this.tracker.get(ip);
    // if the ip does not exists, create it a new entry in the tracker
    if (!ipEntry) {
      // prepare the object
      const trackerOptions: TrackerOptions = {
        createdRooms: 0,
        joinedRooms: 0,
      };
      // if the action is create then
      if (create) {
        // increment the room creation tracker
        trackerOptions.createdRooms++;
      } else {
        // else increment the troom join tracker
        trackerOptions.joinedRooms++;
      }
      this.tracker.set(ip, trackerOptions);
      return true;
    } else {
      // else increment the existing entries
      // if the action is create a room
      if (create) {
        // check if the allowed quota hasn't been reached yet
        if (!this.isCreateQuotaReached(ipEntry)) {
          // if so, increment the ip entry
          ipEntry.createdRooms++;
          return true;
        } else {
          // if the quota is already reached return false
          colorConsole().error(`ip ${ip} has reached create quota`);
          return false;
        }
      } else {
        // same drill
        // if the action is join a room
        // check if the allowed quota hasn't been reached yet
        if (!this.isJoinQuotaReached(ipEntry)) {
          // if so, increment the ip entry
          ipEntry.joinedRooms++;
          return true;
        } else {
          // if the quota is already reached return false
          colorConsole().error(`ip ${ip} has reached join quota`);
          return false;
        }
      }
      // in case
    }
  }
  /**
   * Add an ip address to the tracker
   * @param ip the ip address to track
   * @param create boolean to specify whether the client is creating or joining a room (true or false respectively).
   * @returns Promise: resolve to true if the quota has not been exceeded by the ip yet, reject otherwise
   */
  public startTracking(ip: IpAddress, create: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.track(ip, create)) {
        resolve();
      } else {
        reject();
      }
    });
  }

  /**
   * update and adjust the tracker based on the disconneced ip
   * @param player the disconencted player holding the ip the ip adress
   */
  public ipDisconnected(player: Player): void {
    const ip = player.ip;
    const trackerEntry = this.tracker.get(ip);
    if (trackerEntry) {
      if (player.isRoomCreator) {
        this.decreaseCreatedQuota(trackerEntry);
      } else {
        this.decreaseJoinedQuota(trackerEntry);
      }
    } else {
      colorConsole().error(
        `Attempted to decrement limitation for disconnecting ip:${ip} which was not found in the tracker`
      );
    }
  }
}
