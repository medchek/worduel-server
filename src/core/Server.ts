import { Warden } from "./Warden";
import { EventListener } from "./EventListener";
import { PlayerManager } from "./PlayerManager";
import { RoomManager } from "./RoomManager";
import { joinRoute } from "./../routes/joinRoute";
import homeRoute from "./../routes/homeRoute";
// express
import express, { Express } from "express";
import { createServer, IncomingMessage, Server } from "http";
// import { Socket } from "net";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
// import { RateLimiterMemory } from "rate-limiter-flexible";
// ws
import WebSocket from "ws";
// core modules
import { Player } from "./Player";
// utils
import colors from "colors";
import { replaceWhiteSpaceOnce } from "./utils";
import { colorConsole } from "tracer";
// validation
import { parse } from "qs";
import contains from "validator/lib/contains";
import equals from "validator/lib/equals";
import isInt from "validator/lib/isInt";
import toInt from "validator/lib/toInt";

import RE2 from "re2";
import { Kernel } from "./Kernel";

interface TerminateSocketOpts {
  socket: WebSocket;
  reason?: string;
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

export class GameServer extends Kernel {
  private app: Express;
  private server: Server;
  private ws: WebSocket.Server;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private warden = new Warden();

  private roomList: RoomManager = new RoomManager();
  private playerList: PlayerManager = new PlayerManager();
  private eventListener: EventListener = new EventListener({
    playerList: this.playerList,
    roomList: this.roomList,
  });

  constructor() {
    super();
    if (!process.env.CLIENT_ORIGIN) throw new Error("CLIENT ORIGIN UNDEFINED IN ENV");
    if (!process.env.NODE_ENV) throw new Error("NODE_ENV UNDEFINED");

    this.app = express();
    // Middlewares
    // server.set("trust proxy", 1) // enable for reverse proxy (ngnix, heroku)
    // FIXME
    this.app.use(
      cors({
        origin: process.env.CLIENT_ORIGIN,
        methods: "GET",
        optionsSuccessStatus: 200,
      })
    );
    this.app.use(helmet());
    // rate limiting
    this.app.use(
      rateLimit({
        windowMs: 60 * 3600 * 30, // (60 seconds) * 30 = 1/2 hour
        max: 10, // max requests an ip can perform in the windowsMs
        message: "Too many requests",
        onLimitReached: () => {
          colorConsole().warn("LIMIT REACHED!");
        },
      })
    );
    this.app.use(morgan("combined"));

    // create and attach express to the http server
    this.server = createServer(this.app);
    // create the websocket server
    this.ws = new WebSocket.Server({
      server: this.server,
      clientTracking: true,
    });

    this.playerList.attachRoomList(this.roomList);
    this.roomList.attachPlayerList(this.playerList);
    // activate the core
    this.core();
  }

  /*************************************************************************************************
   *
   *  Handles the connection of clients. First method to be called when a client joins the server
   *
   ************************************************************************************************/
  private core(): void {
    // handle http join room request, to check for room existence and availability
    this.app.use(joinRoute(this.roomList));
    this.app.use(homeRoute());
    // this.handleServerUpgrade();
    this.handleSocketConnection();
    // start the ping/pong connection check
    this.pulse();
    this.handleServerShutDown();
  }

  /**
   * Handles the websocket on("connection") event
   */
  private handleSocketConnection(): void {
    this.ws.on("connection", async (socket, req) => {
      const clientIp = this.getClientIp(req);
      if (!clientIp) {
        this.terminateSocket({
          socket,
        });
        return;
      }
      // Rate limiting
      try {
        await this.wsGlobalRateLimit.consume(
          clientIp,
          2 // consume 10 points per request, which equates to 6 attempts per minute
        );
        // verifying client headers
        this.verifyClientHeaders(req)
          .then(() => {
            // verifying the connection url
            this.verifyClientUrl(req)
              .then(async (res: VerifiedReqUrlResponse) => {
                const { id, requestType, username } = res;
                const player: Player = this.playerList.createPlayer({
                  socket,
                  clientIp,
                  username,
                });
                this.warden
                  .startTracking(player.ip, requestType === "create")
                  .then(() => {
                    // * create room request
                    if (requestType === "create") {
                      this.roomList
                        .createNewRoom({
                          gameId: id,
                          requestedBy: player,
                        })
                        .then((room) => {
                          // # when the room is successfully created
                          // DEVONLY timeout
                          // setTimeout(() => {
                          player.setCanSendMessage();
                          player.setAsRoomCreator();
                          colorConsole().info(`createNewRoom(): room ${room.id} created`);
                          this.eventDispatcher.roomCreated(player, room);
                          // }, 1000);
                        })
                        .catch((err) => {
                          colorConsole().error("createNewRoom() error => ", err);
                        });
                    } else {
                      // * Join room request
                      this.roomList
                        .joinRoom({
                          roomId: typeof id !== "string" ? id.toString() : id,
                          requestedBy: player,
                        })
                        .then((room) => {
                          // DEVONLY timeout
                          // setTimeout(() => {
                          colorConsole().info(
                            `joinedRoom(): ${player.username}:${player.id} joined room ${room.id}`
                          );
                          this.eventDispatcher.roomJoined(player, room);
                          // }, 2000);
                        })
                        .catch((err) => {
                          colorConsole().error("joinRoom() error =>", err);
                        });
                    }

                    //----------------------------------------------------------------------------------------------------
                    this.onMessage(player /*, req*/);
                    this.onPong(player);
                    this.onError(player);
                    // handle client disconnection
                    this.onDisconnect(player);
                  })
                  .catch(() => {
                    colorConsole().error(
                      `[WARDEN] ip ${clientIp} room create/join quota reached`
                    );
                  });

                // end verifyClientUrl then()
              })
              .catch((err) => {
                this.terminateSocket({
                  socket,
                });
                colorConsole().error("Connect url verification failure: ", err);
              });
          })
          .catch((headersError) => {
            this.terminateSocket({
              socket,
            });
            colorConsole().error(headersError);
          });
      } catch (rejRes) {
        const remainingTime = Math.ceil(rejRes.msBeforeNext / (1000 * 60));
        colorConsole().warn(
          "[handleSocketConnection] on.connection =>",
          `socket ip: "${req.socket.remoteAddress}" was blocked for too many connection attempts`,
          `for a duration of ${remainingTime} minute(s)`
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
  protected onMessage(player: Player /*req: IncomingMessage*/): void {
    // TODO rate limit
    const socket = player.socket;

    socket.on("message", async (messageData) => {
      try {
        await this.wsGlobalRateLimit.consume(player.ip, 1.2); // 50 messages per minute

        // first check if the player (client) is allowed to send messages
        if (!player.canSendMessages) {
          colorConsole().warn(`player ${player.ip} cannot yet send messages`);
          return;
        }
        colorConsole().log(`Message received by ${player.username}:${player.id}`); // checks if the message event is working
        // any suspicious data content should terminate the socket connection
        // DEVONLY remove message content display
        colorConsole().info(
          `[DEBUG] Message content by [${player.username}]:`,
          messageData
        );
        // if the message is of type string and its length does not exceed 255
        if (
          typeof messageData === "string" &&
          messageData.length <= 255 &&
          messageData.length > 0
        ) {
          // check if the message is valid json
          try {
            const clientEvent = JSON.parse(messageData.trim());

            // the data received should have a valid type by now,
            // further check the validity of data
            this.eventListener
              .listen(player, clientEvent)
              .then(() => {
                // DEVONLY check message content
                colorConsole().info(clientEvent);
              })
              .catch((err) => {
                colorConsole().error(`Listen() catch : ${err}`);
                return;
              });
            // socket.send(JSON.stringify(clientEvent));
          } catch (err) {
            // invalid JSON string
            this.terminateSocket({
              socket,
              block: {
                ip: player.ip,
                blockDurationSeconds: 60 * 60,
              },
            });
            colorConsole().error("onMessage() => invalid json string", err, messageData);
          }
        } else {
          colorConsole().error("Message checking failed");
          // on check fail
          this.terminateSocket({
            socket,
            block: {
              ip: player.ip,
              blockDurationSeconds: 60 * 60,
            },
          });
        }
      } catch (err) {
        // on limit reached
        colorConsole().error(`onMessage global limiter : limit reached${err}`);
      }
    });
  }
  /**
   * handles the heartbeat of the websocket
   */
  onPong(player: Player): void {
    player.socket.on("pong", () => {
      colorConsole().info(`pong received from ${player.username}:${player.ip}`);
      /** HEATBEAT FUNCTION */
      // set as still alive from when the next heartbeat exectues,
      // this will not terminate the socket on the next ping pulse
      player.isSocketAlive = true;
    });
  }

  private onError(player: Player): void {
    player.socket.on("error", (error) => {
      console.log(error);
    });
  }

  private onDisconnect(player: Player): void {
    player.socket.on("close", () => {
      // handle the warden adjustments for disconnecting clients
      this.warden.ipDisconnected(player);
      // handle room and player removal as well
      this.roomList.handleRoomRemoval(player);
      console.log(`player ${player.username}:${player.id} disconnected`);
    });
  }

  private pulse(): void {
    colorConsole().debug("Starting server pulse");
    const instanceId = process.env.INSTANCE_ID;
    if (process.env.NODE_ENV === "production" && !instanceId) {
      throw new Error("Missing or invalid INSTANCE_ID");
    }
    this.heartbeatInterval = setInterval(() => {
      // check to prevent multi instance re-run
      if (instanceId === "0") {
        if (this.playerList.allPlayers.size === 0) {
          // return colorConsole().debug("0 players conncted, pinging skipped!");
          return;
        }
        colorConsole().debug("pinging the players...");
        this.playerList.allPlayers.forEach((player) => {
          if (player.isSocketAlive === false) return player.socket.terminate();
          // set the beat to false, for the next beat to be possible, if by by the time the method
          // pulses again, and the pong has not been sent yet from the client, the isSocketAlive is still false, thus leading to closing the connection
          player.isSocketAlive = false;
          // ping the player again, and wait for the pong
          player.socket.ping();
        });
      }
      return;
    }, 30 * 1000);
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
    const { socket, reason: reason, block } = options;
    if (socket.readyState == 2 || socket.readyState == 3) return; // return if socket is not open

    const reasonLog = reason ? `Reason: ${reason}.` : "Reason: No reason provided";

    if (block) {
      const { ip, blockDurationSeconds } = block;
      // block the socket
      this.wsGlobalRateLimit
        .block(ip, blockDurationSeconds)
        .then(() => {
          colorConsole().warn(
            `terminateSocket() => socket from ip: ${ip} has been terminated.`,
            reasonLog
          );
        })
        .catch((err) => {
          colorConsole().warn("terminateSocket() => rate limiter block error =>", err);
        });
      // then close it
      socket.close();
    } else {
      // if the no block is required, terminate the socket directly
      colorConsole().warn(
        "terminateSocket() => socket terminated without blocking",
        reasonLog
      );
      socket.close();
    }
  }
  /**
   * This will handle the client request to upgrade to a websocket connection.
   * It will check for the necessary headers and allow or interrupt the connection accordingly
   */
  // private handleServerUpgrade(): void {
  //   this.server.on("upgrade", (req: IncomingMessage, socket: Socket) => {
  //     if (this.verifyClientHeaders(req)) {
  //       colorConsole().info("WS UPGRADE ACCEPTED AT HANDSHAKE");
  //       // resolve();
  //     } else {
  //       socket.destroy();
  //       colorConsole().error(
  //         "WS UPGRADE REFUSED",
  //         "INVALID ORIGIN OR NO VALID IP ADDRESS FROM CONNECTED SOCKET"
  //       );
  //       return;
  //     }
  //   });
  // }

  // should be fired before allowing the connection
  private verifyClientHeaders(req: IncomingMessage): Promise<void> {
    // private verifyClientHeaders(req: ReqMock): Promise<void> {
    if (!process.env.CLIENT_ORIGIN) throw new Error("CLIENT_ORIGIN env not set!");
    console.log(`verifying client:${req.headers["x-forwarded-for"]} headers`);
    return new Promise((resolve, reject) => {
      if (process.env.NODE_ENV !== "production") {
        // if it's in the dev phase
        resolve();
        return;
      }
      if (
        !req.socket.remoteAddress ||
        !req.headers["x-forwarded-for"] ||
        !req.headers["x-forwarded-port"] ||
        !req.headers["x-forwarded-proto"] ||
        req.headers["x-forwarded-proto"] !== "https" ||
        !req.headers.upgrade ||
        req.headers.upgrade !== "websocket" ||
        !req.headers.origin ||
        req.headers.origin !== process.env.CLIENT_ORIGIN
      ) {
        // if the requesting socket has no ip address, then block the connection
        this.verifyClientHeadersErrorTracer(req);
        reject("ERROR WHILE VERIFIYING CLIENT HEADERS");
      } else {
        colorConsole().info("headers verification success");
        resolve();
      }
    });
  }
  // track where the verification failed in the verifyClientHeaders method
  private verifyClientHeadersErrorTracer(req: IncomingMessage): void {
    // private verifyClientHeadersErrorTracer(req: ReqMock): void {
    colorConsole().error("tracing the verification error...");
    function message(reason: boolean) {
      return !reason ? "OK" : "Error";
    }
    console.warn(
      `remoteAdress: ${message(!req.socket.remoteAddress)} => got ${
        req.socket.remoteAddress
      }`
    );
    console.warn(
      `x-forwarded-for: ${message(!req.headers["x-forwarded-for"])} => got ${
        req.headers["x-forwarded-for"]
      }`
    );
    console.warn(
      `x-forwarded-for: ${message(!req.headers["x-forwarded-port"])} => got ${
        req.headers["x-forwarded-port"]
      }`
    );
    console.warn(
      `x-forwarded-for: ${message(!req.headers["x-forwarded-proto"])} => got ${
        req.headers["x-forwarded-proto"]
      }`
    );
    console.warn(
      `x-forwareded-proto value: ${message(
        req.headers["x-forwarded-proto"] !== "https"
      )} got ${req.headers["x-forwarded-proto"]}`
    );
    console.warn(`headers.upgrade: ${message(!req.headers.upgrade)}`);
    console.warn(
      `headers.upgrade: ${message(req.headers.upgrade !== "websocket")} => got ${
        req.headers.upgrade
      }`
    );
    console.warn(`headers.origin: ${message(!req.headers.origin)}`);
    if (req.headers.origin) {
      console.warn(
        `expected origin [${process.env.CLIENT_ORIGIN}] but got [${req.headers.origin}]`
      );
    }
    return;
  }

  /**
   * Verifies the url within the client request.
   *
   * - It checks if the url path corresponds to either createRoom or joinRoom, which are the only two actions allowed and one of either must be requested. If not, the socket is terminated
   * - Furthermore, a username parameters must be provided as well as either of a gameId or roomId params if the sockets is creating or joining a room respectively.
   * - The absence of any of the params and/or path or fail in the authenticity of the types and values of the params will result in the socket termination and ip block
   * @param socket the socket object requesting the action
   * @param req the request object containing the url
   */
  verifyClientUrl(req: IncomingMessage): Promise<VerifiedReqUrlResponse> {
    return new Promise((resolve, reject) => {
      // if (!this.verifyClientHeaders(req)) return reject();
      // logic
      if (req.url) {
        const url = decodeURI(req.url.trim());
        if (url.length >= 23 && url.length <= 57) {
          // minimum length is 23 max is 57

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
                      colorConsole().info("verifyClientUrl() success => ", url);
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
                      colorConsole().info("verifyClientUrl() success => ", url);
                      return;
                    } else reject("invalid room id");
                  } else reject("path not equal join or create");
                } else reject("username regex failure");
              } else reject("username or id not set/not string");
            } else reject("params name not username or id");
          } else reject("path(join/create) and/or params not set");
        } else reject("req.url not set");
      }
      // if any of the if statements fail, reject
      reject(
        new Error(
          "[SERVER.ts=>verifyClientUrl()] A check error occurred when analyzing the join/create url"
        )
      );
      return;
    });
  }

  handleServerShutDown(): void {
    this.ws.on("close", () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      colorConsole().info("Server shut down");
    });
  }

  /**
   * captures the client ip from either the request header if behind a reverse proxy, or else from the requesting ip directly
   * @param req the http client request
   */
  private getClientIp(req: IncomingMessage): string | undefined {
    // capture the client real ip if the server is hosted behind a reverse proxy
    if (req.headers["x-forwarded-for"]) {
      // type checking
      if (typeof req.headers["x-forwarded-for"] === "string") {
        return req.headers["x-forwarded-for"].split(/\s*,\s*/)[0];
      } else {
        colorConsole().error(
          "getClientIp(): Unexpected x-forwarded-for type (not string)"
        );
      }
    } else {
      // otherwise capture the client ip directly
      // this can cannot be undefined as it will be checked for at the handshake process
      return req.socket.remoteAddress as string;
    }
  }
  /**
   * Starts the server
   */
  public listen(): void {
    this.server.listen(process.env.PORT, () => {
      console.log(
        "Server is correctly running",
        "\n",
        colors.green(`http(s):      http://${process.env.CLIENT_ORIGIN || "not-set"}`),
        "\n",
        colors.green(`websocket:    ws://${process.env.CLIENT_ORIGIN || "not-set"}`),
        "\n",
        colors.blue(`expecting requests from origin: ${process.env.CLIENT_ORIGIN}`)
      );
    });
  }
}
