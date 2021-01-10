import { RateLimiterMemory } from "rate-limiter-flexible";
import { RoomManager } from "./RoomManager";
import { PlayerManager } from "./PlayerManager";
import { Player } from "./Player";
import { Kernel } from "./Kernel";
import {
  difficultySettings,
  roundCountSettings,
  timePerRoundSettings,
} from "../config/roomSettings";
import Joi from "joi";

interface EventListenerConsturctor {
  roomList: RoomManager;
  playerList: PlayerManager;
  // player: Player;
}
interface EventListenerBase extends EventLisenerData {
  event: string;
}
interface EventLisenerData {
  settingId?: number;
  settingValue?: number;
}

export class EventListener extends Kernel {
  private roomList: RoomManager;
  private playerList: PlayerManager;
  private softLimiter = new RateLimiterMemory({
    points: 15,
    duration: 10,
    blockDuration: 10,
  });
  constructor(private eventListenerConstructor: EventListenerConsturctor) {
    super();
    this.roomList = eventListenerConstructor.roomList;
    this.playerList = eventListenerConstructor.playerList;
  }
  /**
   * Core of the event listener. It process the raw json recived by the client and reacts to the different events accordingly
   * @param player the player object that belongs to the client
   * @param data json data received from the client
   */
  public listen(player: Player, data: EventListenerBase): Promise<void> {
    return new Promise((resolve, reject) => {
      if (Object.prototype.hasOwnProperty.call(data, "event")) {
        const { event, ...params } = data;
        switch (event) {
          case "setSettings":
            this.setSettings(player, params).then(resolve).catch(reject);
            break;

          default:
            reject("invalid settings event");
            break;
        }
      } else {
        reject();
      }
    });
    //
  }
  /**
   * SID = Setting id where 1 = difficulty. 2 = roundCount. 3 = timePerRound
   * @param player
   * @param data
   */
  async setSettings(player: Player, data: EventLisenerData): Promise<void> {
    if (!player.isLeader || !player.joinedRoomId) throw new Error("Player is not leader");
    const room = this.roomList.getRoom(player.joinedRoomId);
    if (!room) throw new Error("Room not found");
    if (room.hasGameStarted) throw new Error("Unauthorized, game has already started");

    const maxDifficultyId = difficultySettings[difficultySettings.length - 1].id;
    const maxRoundCountId = roundCountSettings[roundCountSettings.length - 1].id;
    const maxTimePerRoundId = timePerRoundSettings[timePerRoundSettings.length - 1].id;

    const schema = Joi.object({
      sid: Joi.number().integer().positive().min(1).max(3).required(),
      id: Joi.alternatives()
        .conditional("sid", {
          switch: [
            {
              is: 1,
              then: Joi.number()
                .integer()
                .positive()
                .min(1)
                .max(maxDifficultyId)
                .required(),
            }, // difficulty
            {
              is: 2,
              then: Joi.number()
                .integer()
                .positive()
                .min(1)
                .max(maxRoundCountId)
                .required(),
            }, // n of rounds
            {
              is: 3,
              then: Joi.number()
                .integer()
                .positive()
                .min(1)
                .max(maxTimePerRoundId)
                .required(),
            }, // time per round
          ],
        })
        .required(),
    });

    try {
      const { sid, id }: { sid: number; id: number } = await schema.validateAsync(data);
      room
        .setRoomSettings(sid, id)
        .then((data) => {
          // only if the room has more than a single player
          if (room.memberCount > 1) {
            this.eventDispatcher.updatedSettings(room, player, data);
          }
        })
        .catch(() => {
          // error while adjusting settings
          throw new Error("setRoomSettings() => error while setting room settings");
        });
    } catch (err) {
      console.error("EventListener.setSettings =>", new Error(err));
    }
  }
}
