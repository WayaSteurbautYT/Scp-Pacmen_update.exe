# Microsoft Store release

## Package route

The recommended route for this Electron game is an MSIX/AppX submission. Microsoft hosts and signs the package and delivers Store updates after certification. The existing portable `.exe` is not an offline installer; the alternative EXE/MSI listing route requires a versioned HTTPS-hosted, offline installer and publisher code signing.

The Partner Center screenshot currently shows an **EXE or MSI app** draft. That submission type takes a hosted installer URL; it does not accept the MSIX package built by this project. For an MSIX submission, create a separate product from **Apps and games → New product → MSIX or PWA app → Game**, reserve the Store name, then open **Product management → Product identity**. Copy the exact values for:

- `Package/Identity/Name` → `STORE_IDENTITY_NAME`
- `Package/Identity/Publisher` → `STORE_PUBLISHER`

The Partner Center ID shown on the overview page is a different GUID and is not the package identity. Keep the Partner Center tab private; the publisher strings are not passwords, but the account page can include private account information.

## Build on Windows

From PowerShell, after the MSIX product identity exists:

```powershell
$env:STORE_IDENTITY_NAME = "paste the exact Package/Identity/Name here"
$env:STORE_PUBLISHER = "paste the exact Package/Identity/Publisher here"
npm run build:windows:store
```

The resulting package is written to `release/`. The build intentionally stops if either identity value is missing. Do not substitute the Partner Center ID or a guessed publisher value. Microsoft re-signs and hosts Store MSIX submissions. If distributing an installer outside the Store, separate hosting and code signing are needed.

## Store submission checklist

1. Complete **Properties**, including the Privacy policy URL, support email, game capabilities, and multiplayer details.
2. Complete the age rating questionnaire.
3. Upload the generated `.appx`/`.msix` package in the matching MSIX product submission.
4. Add the listing description, screenshots, and logo; check that the screenshots match the current game.
5. Validate the package in Partner Center and submit it for certification.

The in-game privacy screen and policy are included in this repository. A GitHub Pages workflow can host the policy at `https://wayasteurbautyt.github.io/Scp-Pacmen_update.exe/privacy.html` after Pages is enabled for this repository with **Settings → Pages → Build and deployment → GitHub Actions**. Store package hosting is separate: Microsoft hosts the MSIX after it passes certification.

## Multiplayer hosting

The packaged desktop app connects to separately hosted multiplayer services; it does not open a LAN server. Account registration uses the PHP/MySQL API, while the Node service handles Socket.IO rooms and PeerJS signaling. Follow [the multiplayer deployment guide](../MULTIPLAYER_DEPLOYMENT.md) before listing online play, then publish the hosted endpoints and privacy details in the store listing. Hosting has operating and privacy/security responsibilities.
