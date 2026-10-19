# Account-backed internet multiplayer

Online rooms use a PHP/MySQL account API and the existing Node.js Socket.IO + PeerJS service. PHP registers accounts and signs 24-hour HS256 access tokens. The room relay checks those tokens before accepting a Socket.IO connection and takes the player name from the signed account claim, so a client cannot choose someone else's displayed account name. Game story and training modes still work locally without an account.

## Self-host the services

1. Point two DNS names (for example `accounts.example.com` and `rooms.example.com`) at a Linux host with Docker Compose and ports 80/443 reachable. Caddy in the included compose stack obtains and renews HTTPS certificates.
2. Copy `multiplayer.env.example` to `.env`. Replace all passwords and the JWT secret with long random values; use the exact same `PACMAN_JWT_SECRET` for PHP and the room relay. Set the real account/room DNS names. Set `PACMAN_ALLOWED_ORIGINS` to your game website origin, add `http://localhost:5173` while testing with Vite if needed, and keep `scp-pac://app` for the packaged desktop app.
3. Start it with `docker compose -f docker-compose.multiplayer.yml up -d --build`. MySQL initializes `php-auth/schema.sql` on its first data-volume creation. Keep the DB volume and secrets backed up. The database is not exposed publicly.
4. In the game's **JOIN / CREATE ROOM** setup, enter `https://accounts.example.com` as the PHP account API and `https://rooms.example.com` as the multiplayer server. Create an account, then use Sign In on future sessions. These two URLs are remembered on that installation. Configure them once while building to embed defaults by setting `VITE_AUTH_API_URL` and `VITE_ROOM_SERVER_URL` in the build environment.

The room host keeps active rooms in memory; restarting it ends rooms. Caddy proxies Socket.IO WebSockets and PeerJS signaling. Voice media uses peer-to-peer WebRTC; networks that block direct UDP connections may need a TURN relay, configured with `VITE_ICE_SERVERS_JSON`. TURN is not included in this stack.

## API and operations

- `POST /api/register` with `{ "email", "username", "password" }`
- `POST /api/login` with `{ "identity", "password" }` where identity is username or email
- Passwords are stored as PHP `PASSWORD_DEFAULT` hashes; SQL access uses PDO prepared statements.
- The client keeps the access token in `sessionStorage` only. It is cleared when the app session closes or the user signs out.
- Use a reverse proxy/WAF rate limit on `/api/login` and `/api/register`, keep PHP/MySQL updated, and serve the game and APIs over HTTPS.

For a manual PHP deployment, use PHP 8.3+ with `pdo_mysql`, an Apache rewrite or equivalent front-controller routing, apply `php-auth/schema.sql`, and set `PACMAN_DB_DSN`, `PACMAN_DB_USER`, `PACMAN_DB_PASSWORD`, `PACMAN_JWT_SECRET`, and comma-separated `PACMAN_ALLOWED_ORIGINS`. Set the same JWT secret and matching allowed origins on the Node room service. Never commit the real `.env` file.
