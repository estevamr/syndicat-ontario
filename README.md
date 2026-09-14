# syndicat-ontario

Locked GitHub Pages site for the co-ownership at **4267, 4269, 4271, rue Ontario Est** (Montréal). The published files live in `docs/`. The inspection and reserve-fund text is **encrypted**; the page asks for a password before it decrypts anything in the browser.

Live URL after Pages is enabled: **https://estevamr.github.io/syndicat-ontario/**

Languages (after unlock): English, français, português (`?lang=en`, `?lang=fr`, `?lang=pt`).

Tabs: inspection (default) and reserve fund (`?tab=fund`).

## Password

GitHub Pages has no server login. The password is used as an AES-GCM key (PBKDF2). Wrong password → the payload does not decrypt.

Keep the password in `.site-password` (gitignored) or pass `SITE_PASSWORD`. Do not commit it.

After you edit files in `src/`:

```bash
node scripts/encrypt.mjs
```

To restore `src/` from the encrypted payload:

```bash
node scripts/decrypt.mjs
```

`src/` is gitignored on purpose. GitHub Free Pages needs a **public** repo, so plaintext source on GitHub would bypass the lock. Only `docs/payload.json` (ciphertext) is published.

This stops casual visitors. It is not a bank vault: a determined person with the password, or with the decrypted session in their own browser, can still copy the text.

## Publish on GitHub Pages

1. Open the repo on GitHub: [estevamr/syndicat-ontario](https://github.com/estevamr/syndicat-ontario).
2. **Settings** → **Pages**.
3. Source: **Deploy from a branch**.
4. Branch: **main**, folder: **/docs**.
5. Save.

## Local preview

```bash
python3 -m http.server 8080 --directory docs
```

Then visit http://localhost:8080
