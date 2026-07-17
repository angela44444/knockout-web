# Deploying Knockout to Squarespace (Business / Core+ plan)

Upload two files (`knockout-app.js` and `knockout-style.css`) to Squarespace file storage, then paste one block of HTML into a Code Block.

Source is **AGPL-3.0** — the live tool links to this repo from its footer (`src/config.ts` → `SOURCE_URL`).

---

## Step 1: Build

```powershell
npm install
npm run build
```

This creates `dist/`:

| File | What it is |
|---|---|
| `dist/knockout-app.js` | Bundled app — upload to Squarespace |
| `dist/knockout-style.css` | Scoped CSS — upload to Squarespace |
| `dist/embed.html` | Snippet to paste into a Code Block |
| `dist/test-local.html` | Preview only — do not upload to Squarespace |

Preview the build: `npm run preview`, then open `test-local.html`.

**Note:** The app loads `@imgly/background-removal` from jsDelivr at runtime (keeps `knockout-app.js` small for Squarespace). First background removal downloads AI model assets (~40–80 MB) from IMG.LY's CDN.

---

## Step 2: Upload files to Squarespace

Squarespace hosts custom files through the Link editor:

1. In the Squarespace editor, open any page and add a temporary **Text Block**.
2. Type anything, highlight it, click the **link icon**.
3. In the link popup, click the **gear** icon, then choose **File**.
4. Upload `dist/knockout-style.css`.
5. Repeat for `dist/knockout-app.js`.
6. Files are available at URLs like:
   - `https://www.zelgraz.com/s/knockout-style.css`
   - `https://www.zelgraz.com/s/knockout-app.js`
7. Delete the temporary text block — uploaded files remain stored.

If Squarespace renames a file (e.g. `knockout-app-1.js`), update URLs in `embed.html` before pasting.

---

## Step 3: Create the page with a Code Block

1. **Pages** → **+** → **Blank Page**. Name it **Knockout** (URL `/knockout`).
2. Add a **Code Block** (requires Core+ / Business plan for JavaScript).
3. Set block type to **HTML**, turn **Display Source** off.
4. Open `dist/embed.html`, copy **all** of it, paste into the Code Block.
5. Fix `/s/...` URLs if Step 2 used different filenames.
6. Save the page and add to navigation if desired.

---

## Step 4: Verify

1. Open `https://www.zelgraz.com/knockout` in an **incognito** window (logged-in editor may hide scripts).
2. If the embed is blank: **Site Styles** → disable **Ajax loading** → retest.
3. Drop a test image → wait for model download on first run → download transparent PNG.
4. Confirm **Source code** footer link opens this GitHub repo.

---

## Step 5: Updates later

1. Edit source, run `npm run build`.
2. Re-upload `knockout-app.js` and `knockout-style.css` to Squarespace.
3. Push changes to GitHub and tag a release if you version deployments.
4. Re-paste `embed.html` only if HTML structure changed.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Blank embed when logged in | Preview in incognito or Safe Mode |
| Script does not run | Confirm Business/Core+ plan; Code Block set to HTML |
| Slow first run | Normal — model download from IMG.LY CDN |
| Styles clash with theme | CSS is scoped under `.ko-app`; report specific conflicts |
