import { MessageOptions } from "./EventDispatcher";
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
import { Room } from "./Room";

import escape from "validator/lib/escape";

interface EventListenerConstructor {
  roomList: RoomManager;
  playerList: PlayerManager;
  // player: Player;
}
interface EventListenerBase extends EventListenerData {
  event: string;
}
export interface EventListenerData {
  settingId?: number;
  settingValue?: number;
  answer?: string;
  idx?: number;
  hint?: string;
}

export class EventListener extends Kernel {
  private roomList: RoomManager;
  private playerList: PlayerManager;
  private chatLimiter = new RateLimiterMemory({
    points: 9,
    duration: 5,
    blockDuration: 10,
  });

  private hintLimiter = new RateLimiterMemory({
    points: 1,
    duration: 2,
  });

  constructor(eventListenerConstructor: EventListenerConstructor) {
    super();
    this.roomList = eventListenerConstructor.roomList;
    this.playerList = eventListenerConstructor.playerList;
  }
  /**
   * Core of the event listener. It process the raw json received by the client and reacts to the different events accordingly
   * @param player the player object that belongs to the client
   * @param data json data received from the client
   */
  public listen(player: Player, data: EventListenerBase): Promise<void> {
    return new Promise((resolve, reject) => {
      if (Object.prototype.hasOwnProperty.call(data, "event")) {
        const roomId = player.joinedRoomId;
        if (!roomId) {
          reject;
          throw new Error("Player has not joined a room ");
        }
        const room = this.roomList.getRoom(roomId);
        if (!room) {
          reject;
          throw new Error("Room not found");
        }
        const { event, ...params } = data;
        switch (event) {
          case "setSettings":
            this.onSetSettings(player, room, params)
              .then(() => resolve())
              .catch(() => reject());
            break;
          case "start":
            this.onStartGame(player, room)
              .then(() => resolve())
              .catch(() => reject());
            break;
          case "answer":
            if (data.answer) {
              this.onAnswer(player, room, data.answer)
                .then(() => resolve())
                .catch(() => reject());
            } else reject();
            break;
          case "wordSelected":
            if (data.idx) {
              this.onWordSelect(player, room, data.idx)
                .then(() => resolve())
                .catch(() => reject());
            } else reject();
            break;
          case "hint":
            if (data.hint) {
              this.onHint(player, room, data.hint)
                .then(() => resolve())
                .catch(() => reject());
            } else reject();
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
   * @param player the player object that belongs to the client
   * @param data data containing setting id & setting value
   */
  async onSetSettings(
    player: Player,
    room: Room,
    data: EventListenerData
  ): Promise<void> {
    if (!player.isLeader) throw new Error("Player is not leader");
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
  /**
   * Client request to begin the game
   * @param player the player object that belongs to the client
   */
  onStartGame(player: Player, room: Room): Promise<void> {
    return new Promise((resolve, reject) => {
      // if the player is the leader
      if (player.isLeader) {
        // if the game has not started yet
        if (!room.hasGameStarted) {
          // if there are more than one player in the room
          if (room.memberCount > 1) {
            //
            room.startGame();
            resolve();
          }
        } else {
          reject();
          throw new Error("startGame() => Game has already started!");
        }
      } else {
        reject();
        throw new Error("startGame() => player is not leader");
      }
    });
  }
  /**
   * Client hint word selection event
   * @param wordIndex the index of the selected word among the three items in the array
   */
  async onWordSelect(player: Player, room: Room, wordIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        player.isTurn &&
        player.canSelectWord &&
        room.phase == 1.2 && // 1.2 = word selection window phase
        wordIndex >= 0 &&
        wordIndex <= 2
      ) {
        //
        room.playerHasSelectedWord(player, wordIndex);
        resolve();
      } else {
        reject();
        player.socket.close();
      }
    });
  }

  /**
   * The current player sends a hint to the other players in the room
   * @param player
   * @param room
   * @param hint
   */
  async onHint(player: Player, room: Room, hint: string): Promise<void> {
    try {
      await this.hintLimiter.consume(player.ip, 1);
      return new Promise((resolve, reject) => {
        if (room.hasGameStarted && room.hasTurns && room.phase === 2 && player.isTurn) {
          if (hint.length > 0 && hint.length <= 150) {
            room.hintReceived(player, escape(hint));
            resolve();
          } else reject();
          //
        } else reject();
      });
    } catch (err) {
      throw new Error("onHint => hintLimiter reached");
    }
  }

  /**
   * Client sending chat message
   * @param player  the player object that belongs to the client
   * @param room  the room object
   * @param answer the answer/message of the client
   */
  async onAnswer(player: Player, room: Room, answer: string): Promise<void> {
    try {
      await this.chatLimiter.consume(`${player.ip}:${player.id}`, 1);
      // if the answer is of acceptable size, proceed
      if (answer.length < 100) {
        if (room.hasGameStarted) {
          // also only players that are not currently playing can send answers
          if (player.isTurn)
            throw new Error("Unauthorized action: currently playing client sent answer");
          // only if the game has started
          room
            .checkAnswer(player, answer.trim())
            .then((reason) => {
              // reason === 0 => regular message
              // reason === 1 => has just found correct answer !
              // reason === 2 => has already found answer
              const message: MessageOptions = {
                type: reason,
                player,
                room,
                message: answer,
              };
              // // if the player has found the correct answer, dont forward it to the client chat so as to let others continue guessing it.
              // // only forward the message if the type is not 1
              // if (reason != 1) message.message = answer;

              // if the player gets the correct answer
              if (reason == 1) {
                // mark the player as having correctly answered during the current round
                player.setHasAnswered();
                room.calculatePlayerScore(player);
                // TODO check if all players have found the answer when a player answers correctly. If so, end the current round and move to the next
                // if all players have answered
                if (room.hasAllAnswered) {
                  // end the round
                  room.endRound();
                }
              }
              // dispatch the message
              this.eventDispatcher.sendChatMessage(message);
            })
            .catch(() => {
              throw new Error("[room.checkAnswer()] Unexpected user input.");
            });
        } else throw new Error("[onAnswer()] Game has not started yet");
      } else throw new Error("[onAnswer()] answer length exceeds what is allowed");
    } catch (err) {
      // if the rate limiter kicks in
      this.eventDispatcher.slowDown(player);
      throw new Error(
        `${player.username}:${player.ip} is sending too many messages in the chat`
      );
    }
  }
}
