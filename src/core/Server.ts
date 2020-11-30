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

// utils
import colors from "colors";

export class GameServer {
  private app: Express;
  private server: Server;
  private ws: WebSocket.Server;
  private wsConnectRateLimit: RateLimiterMemory = new RateLimiterMemory({
    points: 2, // max requests
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
    this.app.get("/", (req, res) => {
      res.status(403).send("Access denied");
    });
    // create and attach express to the http server
    this.server = createServer(this.app);
    // this.server = createServer((req, res) => {
    //   res.write("hello world");
    //   res.end();
    //   console.log(req);
    // });
    // create the websocket server
    this.ws = new WebSocket.Server({
      server: this.server,
      clientTracking: true,
    });

    // activate the core

    this.core();
  }

  /**
   *  Handles the connection of clients. First method to be called when a client joins the server
   */
  private core(): void {
    this.handleServerUpgrade();
    // this.handleSocketConnection();
  }

  private handleSocketConnection() {
    this.ws.on("connection", async (socket, req) => {
      console.log("connection established");
      // rate limiting
      try {
        await this.wsConnectRateLimit.consume(
          req.socket.remoteAddress as string // this will be verified to never be undefined in the verifyClientHeaders, hence the type cast.
        );
        // logic
        this.onMessage(socket);

        this.onError(socket);
        // handle client disconnection
        this.onDisconnect(socket);

        socket.send(`Hi your ip adress is ${req.socket.remoteAddress}`);
      } catch (rejRes) {
        console.warn(`socket ${req.socket.remoteAddress} was blocked`);
        // ms to minutes convertion
        const remainingTime = Math.floor(rejRes.msBeforeNext / (1000 * 60));
        socket.send(
          `Too many connection attempts, you have been blocked for ${remainingTime} minutes`
        );
        socket.close();
      }
    });
  }

  private onMessage(socket: WebSocket) {
    socket.on("message", (data) => {
      console.log("message received");
      socket.send(`Your message was ${data}`);
    });
  }
  private onError(socket: WebSocket) {
    socket.on("error", (error) => {
      console.error(error);
    });
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
        this.handleSocketConnection();
      } else {
        socket.destroy();
        console.log("HTTP UPGRADE REFUSED");
      }
    });
  }

  private onDisconnect(socket: WebSocket): void {
    socket.on("close", () => {
      console.log("socket disconnected");
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
        "CONNECTION BLOCKED. NO IP ADDRESS FROM CONNECTED SOCKET OR ORIGIN"
      );
      return false;
    }

    return true;
  }

  /**
   * Starts the server
   * @param port a custom port for attaching the server to.
   */
  public listen(port = 9090): void {
    this.server.listen(process.env.PORT || port, () => {
      console.log(
        `Server is correctly running at ${colors.green(
          `ws://localhost:${port}`
        )}`
      );
    });
  }
}
