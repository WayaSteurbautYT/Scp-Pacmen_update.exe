import { createRoomServer } from "./room-server.js";
import { PeerServer } from "peer";

const port = Number(process.env.PACMAN_ROOM_PORT || 3100);
const host = process.env.PACMAN_ROOM_HOST || "0.0.0.0";
const roomServer = createRoomServer({ host, port });
const address = await roomServer.listen();
const peerPort = Number(process.env.PACMAN_PEER_PORT || 9000);
const peerPath = process.env.PACMAN_PEER_PATH || "/voice";

PeerServer({
  port: peerPort,
  path: peerPath,
  key: process.env.PACMAN_PEER_KEY || "peerjs",
  proxied: process.env.PACMAN_PEER_PROXIED === "true",
  allow_discovery: false,
  concurrent_limit: 100,
}, (peerServer) => {
  const peerAddress = peerServer.address();
  console.log(`PeerJS voice signaling listening on ${peerAddress.address}:${peerAddress.port}${peerPath}`);
});

console.log(`Neon Maze rooms listening on ${address.address}:${address.port}`);
