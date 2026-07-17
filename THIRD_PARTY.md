# Third-party software

## @imgly/background-removal

- **Repository:** https://github.com/imgly/background-removal-js
- **License:** GNU Affero General Public License v3 (AGPL-3.0)
- **Use:** In-browser background removal. The app bundle loads this library from **jsDelivr** at runtime (`knockout-app.js` stays small for Squarespace). ONNX models are fetched from IMG.LY CDN on first use.

## onnxruntime-web

- **Repository:** https://github.com/microsoft/onnxruntime
- **License:** MIT
- **Use:** ONNX runtime peer dependency for @imgly/background-removal

## Fonts (Google Fonts)

- **Syne** — SIL Open Font License
- **Instrument Sans** — SIL Open Font License

Loaded from Google Fonts CDN in the Squarespace embed.
