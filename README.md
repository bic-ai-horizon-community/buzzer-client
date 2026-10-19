# AI Horizon Buzzer Client

A real-time, multiplayer buzzer interface built with React and Vite. The application lets participants join a live game, buzz in during open rounds, and view rankings as they are calculated. Hosts can control rounds, configure answer options, select the correct answer, and reveal the winner with an animated result screen.

> **Live application:** [ai-horizon-buzzer-client.vercel.app](https://ai-horizon-buzzer-client.vercel.app)

## Features

- Real-time communication powered by Socket.IO
- Player lobby with live participant updates
- Single-button buzzer mode for general questions
- Multiple-option buzzer mode for questions with choices
- Reaction-time tracking in milliseconds
- Host controls for starting and resetting rounds
- Correct-answer selection and winner reveal workflow
- Live rankings and winner announcements
- Dedicated TV/spectator leaderboard view
- Responsive interface optimized for desktop and mobile devices
- Local session restoration using browser storage
- Haptic feedback and visual feedback when a player buzzes
- Animated winner modal with confetti and celebration effects

## Application Routes

| Route | Description |
| --- | --- |
| `/` | Player view. Participants enter their name and join the game. |
| `/admin` | Host view. Hosts authenticate and manage game rounds. |
| `/tv` | Live spectator/TV leaderboard view. |
| `/rankings` | Alternate route for the live leaderboard view. |

## How a Game Works

1. Open the application and join with a display name.
2. Open `/admin` and sign in with host credentials.
3. Enter comma-separated options, or leave the options empty for a general buzzer round.
4. Select **Open Buzzer** to start the round.
5. Players buzz by selecting an option or pressing the main buzzer.
6. The host can mark the correct option when answer choices are configured.
7. Select **Reveal Winner** to announce the fastest eligible response.
8. Review the rankings, then select **Reset Game** to prepare the next round.

## Tech Stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Socket.IO Client](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) components
- [Lucide React](https://lucide.dev/) icons
- JavaScript, CSS, and HTML

## Prerequisites

- Node.js 18 or newer
- npm
- A running Socket.IO game server

The client expects the real-time server to be available on port `3001` during local development unless a different URL is provided through `VITE_SERVER_URL`.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/samTime101/AI_HORIZON_BUZZER_CLIENT.git
cd AI_HORIZON_BUZZER_CLIENT
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the server URL

For local development, the client automatically connects to port `3001` on the same host that served the Vite application.

To use a different server, create a `.env` file in the project root:

```env
VITE_SERVER_URL=http://localhost:3001
```

For a deployed client, use the public URL of your Socket.IO server:

```env
VITE_SERVER_URL=https://your-buzzer-server.example.com
```

> Restart the Vite development server after changing environment variables.

### 4. Start the development server

```bash
npm run dev
```

Vite will print the local URL in the terminal. To test across devices on the same network, open the URL using the host machine's local IP address.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Creates an optimized production build. |
| `npm run preview` | Serves the production build locally for verification. |
| `npm run lint` | Runs ESLint across the project. |

## Production Build

Build the application with:

```bash
npm run build
```

The generated files are placed in the `dist/` directory. The project includes Vercel configuration and can be deployed to Vercel or another static hosting provider that supports single-page applications.

When deploying, configure `VITE_SERVER_URL` in the hosting provider's environment variables and ensure that the Socket.IO server allows requests from the deployed client origin.

## Real-Time Server Requirements

This repository contains the client application. A compatible Socket.IO server is required to provide game state and handle events such as:

- `register_user`
- `admin_login`
- `admin_reconnect`
- `start_round`
- `reset_round`
- `buzz`
- `set_correct_option`
- `reveal_winner`
- `tv_register`

The server should broadcast events including user updates, game state changes, correct-answer updates, and winner announcements.

## Project Structure

```text
.
├── public/                 # Logos, icons, and public assets
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── assets/            # Application assets
│   ├── lib/               # Utility functions
│   ├── App.jsx            # Routes and main application logic
│   ├── App.css            # Application-specific styles
│   ├── index.css          # Global styles and Tailwind layers
│   └── main.jsx           # React entry point
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

## Mobile and Local Network Testing

The client resolves the default development server URL from the hostname used to load the page. This allows phones and other devices on the same local network to connect to the development machine instead of trying to connect to their own `localhost`.

For local-network testing:

1. Start the compatible Socket.IO server on the host machine.
2. Start this client with `npm run dev -- --host`.
3. Open the Vite URL using the host machine's LAN IP address on each device.
4. Confirm that the server firewall allows the client and Socket.IO ports.

## Linting and Verification

Run the project's checks before submitting changes:

```bash
npm run lint
npm run build
```

## Contributing

1. Create a feature branch.
2. Make focused changes that preserve the existing real-time game flow.
3. Run `npm run lint` and `npm run build`.
4. Open a pull request with a clear description of the change and testing performed.

## License

No license has been specified for this repository. Contact the repository owner before using or redistributing the code outside the project.
