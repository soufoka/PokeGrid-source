<div align="center">

<img src="tray.png" width="72" alt="PokeGrid">

# PokeGrid

**Four Poke Idle World accounts in a single window.**

![Platform](https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-0078D6)
![Electron](https://img.shields.io/badge/Electron-43-47848F)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Português](README.md)

<img src="docs/screenshot.png" width="880" alt="PokeGrid running four accounts at once">

</div>

> This is the run-from-source version. There is no ready-made executable to download: you grab the code, look at what it does and run it yourself. That way the trust is on you, not on me.

> ### 🔒 Your login data stays only on your computer
> Login and password are encrypted on your own PC and never leave it. No server, no repository. The whole code is here for you to check.

## What it is

Four accounts running at once, each in its own quadrant with a separate session. You save the login once and the app signs in on its own from then on. If a session drops mid farm, it logs back in without you being around. It does not automate the game or touch the captcha, it only organizes the accounts you already have.

## How to run

You need Node.js installed once. After that it is quick.

**1. Install Node.js**
Download the LTS version at [nodejs.org](https://nodejs.org) and install it (just next, next, finish).

**2. Download this code**
Click the green **Code** button above, then **Download ZIP**. Extract the folder wherever you want. If you use Git, clone it:

```bash
git clone https://github.com/soufoka/PokeGrid-source.git
```

**3. Open the app**
On Windows, double click the **iniciar.bat** file in the folder. The first time it installs what it needs and opens on its own; after that it opens right away.

On macOS or Linux, open a terminal in the folder and run:

```bash
npm install
npm start
```

That is it. Log in or create an account in each panel and, under "Treinadores" (Accounts), save the login. Next time it signs in on its own.

## What it does

- Auto login, even when the session expires in the middle of a farm.
- Eco mode that keeps CPU use down without hurting progress.
- Hides the chat and the game icon menu to free up screen.
- Notifies you when an account drops or runs out of Pokéballs.
- Turn each panel on or off, zoom, full screen and keyboard shortcuts.
- Tray, start with Windows, and Portuguese or English.

## Security

- Passwords are encrypted by Electron's `safeStorage`, which uses the OS API (DPAPI on Windows). They never leave the PC.
- Panels are locked to the game's domain. An external link opens in your real browser, and the password is only typed into the official login page.
- The game's camera, microphone, location and notifications are blocked.
- You always solve the captcha. The app fills the fields and presses Enter when you tick the box, but it never touches the "Confirm you are human" widget. Beating bot detection is not the point.

## Under the hood

Each panel is an Electron `<webview>` with its own partition (`persist:conta1` to `conta4`), and that is what keeps the accounts isolated and logged in between launches. Whatever the game does not offer, the app injects into each panel: Eco swaps `requestAnimationFrame` for a slower version, the login fills through the input's native setter, and the menu and chat disappear via CSS with a `MutationObserver`. It is all in `main.js`, `preload.js` and `index.html`, nothing hidden.

## License

MIT. Independent project, not affiliated with Poke Idle World.
