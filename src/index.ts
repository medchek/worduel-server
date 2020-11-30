import "./config/env";

import { GameServer } from "./core/Server";
console.clear();
const server = new GameServer();

server.listen(9000);
