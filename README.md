# Knockout Web

Browser-based background remover for [zelgraz.com](https://www.zelgraz.com). Images are processed entirely in the visitor's browser — nothing is uploaded to a server.

Licensed under **AGPL-3.0** because this project incorporates [@imgly/background-removal](https://github.com/imgly/background-removal-js).

## Live

`https://www.zelgraz.com/knockout`

## Build

```powershell
npm install
npm run build
```

Outputs in `dist/`:

| File | Purpose |
|---|---|
| `knockout-app.js` | Upload to Squarespace `/s/` |
| `knockout-style.css` | Upload to Squarespace `/s/` |
| `embed.html` | Paste into a Code Block |
| `test-local.html` | Preview the build before upload (`npm run preview`) |

## Develop

```powershell
npm run dev
```

Opens Vite dev server with hot reload.

## Deploy to Squarespace

See [DEPLOY.md](DEPLOY.md).

## Third-party

See [THIRD_PARTY.md](THIRD_PARTY.md).
