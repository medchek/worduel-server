import { joinRoute } from "./../routes/joinRoute";
import { EventDispatcher } from "./EventDispatcher";
// express
import express, { Express } from "express";
import { createServer, IncomingMessage, Server } from "http";
import { Socket } from "net";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";
// ws
import WebSocket from "ws";
// core modules
import { Player } from "./Player";
import { PlayerManager } from "./PlayerManager";
import { RoomManager } from "./RoomManager";
// utils
import colors from "colors";
import { replaceWhiteSpaceOnce } from "./Utils";
// validation
import { parse } from "qs";
import contains from "validator/lib/contains";
import equals from "validator/lib/equals";
import isInt from "validator/lib/isInt";
import toInt from "validator/lib/toInt";

import RE2 from "re2";

interface TerminateSocketOpts {
  socket: WebSocket;
  message?: string;
  block?: {
    ip: string | number;
    blockDurationSeconds: number;
  };
}

interface VerifiedReqUrlResponse {
  requestType: "create" | "join";
  username: string;
  id: string | number;
}

interface Message {
  event: string;
  message: string;
  code?: number;
}

export class GameServer {
  private app: Express;
  private server: Server;
  private ws: WebSocket.Server;
  private dispatch = new EventDispatcher();

  public playerList: PlayerManager = new PlayerManager();
  public roomList: RoomManager = new RoomManager({ eventDispatcher: this.dispatch });

  private wsGlobalRateLimit: RateLimiterMemory = new RateLimiterMemory({
    points: 10, // max requests
    duration: 10, // window in seconds
    blockDuration: 60 * 60, // block period in seconds
  });

  constructor() {
    this.app = express();
    // middlewares
    // server.set("trust proxy", 1) // enable for reverse proxy (ngnix, heroku)
    this.app.use(
      cors({
        allowedHeaders: ["http://localhost:8080"],
        methods: ["POST", "GET"],
      })
    );
    this.app.use(helmet());
    // rate limiting
    this.app.use(
      rateLimit({
        windowMs: 60 * 3600 * 60, // (60 seconds) * 60 = 1 hourse
        max: 10, // max requests an ip can perform in the windowsMs
        message: "Too many requests",
        onLimitReached: () => {
          console.log("LIMIT REACHED!");
        },
      })
    );
    // handle http join room request, to check for room existance and availability

    // create and attach express to the http server
    this.server = createServer(this.app);
    // create the websocket server
    this.ws = new WebSocket.Server({
      server: this.server,
      clientTracking: true,
    });

    // attach the corresponding lists to both classes
    this.playerList.attachRoomList(this.roomList);
    this.roomList.attcahPlayerList(this.playerList);
    // activate the core
    this.core();
  }

  /*************************************************************************************************
   *
   *  Handles the connection of clients. First method to be called when a client joins the server
   *
   ************************************************************************************************/
  private core(): void {
    this.app.use(joinRoute(this.roomList));
    this.handleServerUpgrade();
    this.handleSocketConnection();
  }
  /**
   * Handles the websocket on("connection") event
   */
  private handleSocketConnection(): void {
    this.ws.on("connection", async (socket, req) => {
      // rate limitingu
      try {
        await this.wsGlobalRateLimit.consume(
          req.socket.remoteAddress as string, // this will be verified to never be undefined in the verifyClientHeaders, hence the type cast.
          5
          // 1
        );

        this.verifyClientUrl(req)
          .then((res: VerifiedReqUrlResponse) => {
            const { id, requestType, username } = res;
            const player: Player = this.playerList.createPlayer({
              socket,
              req,
              username,
            });
            // give the client its unique identifier
            /**
             * TODO : create or join a room
             *
             */
            // * create romm request
            if (requestType === "create") {
              this.roomList
                .createNewRoom({
                  gameId: id,
                  requestedBy: player,
                })
                .then((room) => {
                  // # when the room is successfully created
                  setTimeout(() => {
                    console.log("createNewRoom() room created =>", room.id);
                    this.dispatch.roomCreated(player, room);
                  }, 1000);
                })
                .catch((err) => {
                  console.error("createNewRoom() error => ", err);
                });
            } else {
              // * Join romm request
              console.log("joining");
              this.roomList
                .joinRoom({
                  roomId: typeof id !== "string" ? id.toString() : id,
                  requestedBy: player,
                })
                .then((room) => {
                  // player.socket.send("successfully joined room");
                  this.dispatch.roomJoined(player, room);
                  console.log("joinedRoom() room joined!");
                })
                .catch((err) => {
                  console.log("joinRoom() error =>", err);
                });
            }

            //---------------------------------------
            this.onMessage(player, req);

            this.onError(player);
            // handle client disconnection
            this.onDisconnect(player);
          })
          .catch((err) => {
            this.terminateSocket({
              socket,
            });
            console.error(err);
          });
      } catch (rejRes) {
        const remainingTime = Math.floor(rejRes.msBeforeNext / (1000 * 60));
        console.warn(
          "[handleSocketConnection] on.connection =>",
          `socket ip: "${req.socket.remoteAddress}" was blocked for too many connection attempts`,
          `for a duration of ${remainingTime}} minute(s)`
        );

        // `Too many connection attempts, you have been blocked for ${remainingTime} minutes`
        socket.send(
          this.sendJson({
            event: "TooManyAttempts",
            message:
              "You have been temporarily suspended due to too many connection attempts, please try again later",
          })
        );
        socket.close();
      }
    });
    // test
  }

  /**
   * The message event from the client
   * @param socket the socket object
   * @param req the request object that is needed to extract the ip
   */
  protected onMessage(player: Player, req: IncomingMessage): void {
    const socket = player.socket;

    socket.on("message", (messageData) => {
      return new Promise((resolve, reject) => {
        // first check if the player (client) is allowed to send messages
        if (!player.canSendMessages) {
          console.warn("player cannot yet send messages");
          reject();
          return;
        }
        console.log("message received"); // checks if the message event is working
        // any suspecious data content should terminate the socket connection

        // if the message is of type string and its length does not exceed 255
        if (
          typeof messageData === "string" &&
          messageData.length <= 255 &&
          messageData.length > 0
        ) {
          // check if the message is valid json
          try {
            const clientEvent = JSON.parse(messageData);
            // the data received should have a valid type by now,
            // furthre check the validity of data

            socket.send(JSON.stringify(clientEvent));
            resolve(clientEvent);
          } catch (err) {
            this.terminateSocket({
              socket,
              block: {
                ip: req.socket.remoteAddress as string,
                blockDurationSeconds: 60 * 60,
              },
            });
            reject();
            console.error("onMessage() => invalid json", err);
          }
        } else {
          console.log("message checking failed");
          // on check fail
          this.terminateSocket({
            socket,
            block: {
              ip: req.socket.remoteAddress as string,
              blockDurationSeconds: 60 * 60,
            },
          });
          reject();
        }
      });
    });
  }

  private onError(player: Player): void {
    player.socket.on("error", (error) => {
      console.log(error);
    });
  }

  private onDisconnect(player: Player): void {
    player.socket.on("close", () => {
      // TODO: Test the bellow method
      this.roomList.handleRoomRemoval(player);
    });
  }

  /**
   * Forms a string of a JSON object out of the provided parameters.
   * @param message the message to send to the client.
   * @param type the type of message (error, success, message).
   * @returns a stringified JSON object.
   */
  private sendJson(json: Message): string {
    return JSON.stringify(json);
  }

  /**
   * Terminate the connection of the client socket.
   * @param socket the client websocket object.
   * @param message a message to send to the client before the connection is closed.
   */

  private terminateSocket(options: TerminateSocketOpts): void {
    const { socket, message, block } = options;
    if (socket.readyState == 2 || socket.readyState == 3) return; // return if socket is not open

    if (message) socket.send(JSON.stringify({ type: "error", message }));
    if (block) {
      const { ip, blockDurationSeconds } = block;
      // block the socket
      this.wsGlobalRateLimit
        .block(ip, blockDurationSeconds)
        .then(() => {
          console.error(
            `terminateSocket() => socket from ip: ${ip} has been terminated.`
          );
        })
        .catch((err) => {
          console.error("terminateSocket() => block error =>", err);
        });
      // then close it
      socket.close();
    } else {
      // if the no block is required, terminate the socket directly
      console.error("terminateSocket() => socket terminated without blocking");
      socket.close();
    }
  }
  /**
   * This will handle the client request to upgrade to a websocket connection.
   * It will check for the necessary headers and allow or interrupt the connection accordingly
   */
  private handleServerUpgrade(): void {
    this.server.on("upgrade", (req: IncomingMessage, socket: Socket) => {
      // this.ws.shouldHandle(req)
      if (this.verifyClientHeaders(req)) {
        console.log("WS UPGRADE ACCEPTED AT HANDSHAKE");
      } else {
        socket.destroy();
        console.log("WS UPGRADE REFUSED");
      }
    });
  }

  // should be fired before allowing the connection
  private verifyClientHeaders(req: IncomingMessage): boolean {
    const allowedOrigins = [
      "chrome-extension://cbcbkhdmedgianpaifchdaddpnmgnknn", // temp for dev
      "http://localhost:8080",
    ];

    // if the requesting socket has no ip adress, then block the connection
    if (
      !req.socket.remoteAddress ||
      req.headers["x-forwarded-for"] ||
      !req.headers.origin ||
      !allowedOrigins.includes(req.headers.origin)
    ) {
      // socket.close();
      console.error(
        "CONNECTION BLOCKED. NO IP ADDRESS FROM CONNECTED SOCKET OR INVALID ORIGIN"
      );
      return false;
    }

    return true;
  }

  /**
   * Verifies the url within the client request.
   *
   * - It checks if the url path corresponds to either createRoom or joinRoom, which are the only two actions allowed and one of either must be requested. If not, the socket is terminated
   * - Furthermore, a username parameters must be provided as well as either of a gameId or roomId params if the sockets is creating or joining a room respectively.
   * - The absence of any of the params and/or path or fail in the authenticity of the types and values of the params will result in the socket termination and ip block
   * @param socket the socket object requesting the action
   * @param req the request object containg the url
   */
  verifyClientUrl(req: IncomingMessage): Promise<VerifiedReqUrlResponse> {
    return new Promise((resolve, reject) => {
      // logic
      if (req.url) {
        const url = decodeURI(req.url.trim());
        if (url.length >= 23 && url.length <= 57) {
          // minimum length is 23 max is 57
          console.log("verifyClientUrl", url);
          const [path, paramStr] = url.split("?");
          // if a valid format is present
          if (path && paramStr) {
            // if the received params are username & id
            if (contains(paramStr, "username=") && contains(paramStr, "id=")) {
              const params = parse(paramStr, {
                parameterLimit: 2,
                depth: 1,
                allowDots: false,
                delimiter: "&",
                ignoreQueryPrefix: true,
                parseArrays: false,
              }); // should yield {id: number; username: string}

              // Object.prototype.hasOwnProperty.call(params, "username") &&
              // Object.prototype.hasOwnProperty.call(params, "id")

              // check the validity of param names
              if (
                params.username &&
                typeof params.username === "string" &&
                params.id &&
                typeof params.id === "string"
              ) {
                let username = params.username;

                const usernameReg: RE2 = new RE2(/^[a-zA-Z0-9 _-]{3,15}$/);
                if (usernameReg.test(username)) {
                  username = replaceWhiteSpaceOnce(username, { trim: true });

                  // depending on the path
                  // IF IT IS A CREATE ROOM REQUEST ---------------------------------------------
                  if (equals(path, "/create")) {
                    // check for the game id;
                    if (isInt(params.id, { min: 1, max: 3 })) {
                      resolve({
                        requestType: "create",
                        id: toInt(params.id),
                        username,
                      });
                      return;
                    }
                    // IF IT IS A JOIN ROOM REQUEST ---------------------------------------------
                  } else if (equals(path, "/join")) {
                    const roomIdReg = new RE2(/^[\w-]{21}$/);
                    if (params.id.length === 21 && roomIdReg.test(params.id)) {
                      resolve({
                        requestType: "join",
                        id: params.id,
                        username,
                      });
                      return;
                    } else console.error("invalid room id");
                  } else console.error("path not equal join or create");
                } else console.error("username regex failure");
              } else console.error("username or id not set/not string");
            } else console.error("params name not username or id");
          } else console.error("path(join/create) and/or params not set");
        } else console.error("req.url not set");
      }
      // if any of the if statements fail, reject
      reject(
        new Error(
          "[SERVER.ts=>verifyClientUrl()] A check error occured when analysing the join/create url"
        )
      );
      return;
    });
  }

  /**
   * Starts the server
   * @param port a custom port for attaching the server to.
   */
  public listen(): void {
    this.server.listen(process.env.PORT, () => {
      console.log(
        "Server is correctly running",
        "\n",
        colors.green(`http(s):      http://localhost:${process.env.PORT}`),
        "\n",
        colors.green(`websocket:    ws://localhost:${process.env.PORT}`)
      );
    });
  }
}
