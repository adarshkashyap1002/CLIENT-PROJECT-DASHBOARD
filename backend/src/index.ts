import { createServer } from "http";
import { createApp } from "./app";
import { initSockets } from "./sockets";
import { startOverdueJob } from "./jobs/overdueJob";
import { env } from "./config/env";

const app = createApp();
const server = createServer(app);

initSockets(server);
startOverdueJob();

server.listen(env.port, () => {
  console.log(`API + WebSocket server listening on :${env.port}`);
});
