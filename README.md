# syndicat-ontario

Site of the co-ownership at **4267-4271, rue Ontario Est** (Montréal). The inspection summary is a static page under `docs/`, ready for [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Live URL after Pages is enabled: **https://estevamr.github.io/syndicat-ontario/**

Languages: English, français, português (`?lang=en`, `?lang=fr`, `?lang=pt`).

## Publish on GitHub Pages

The repository already exists and is public-ready. You only need to point Pages at the `docs` folder:

1. Open the repo on GitHub: [estevamr/syndicat-ontario](https://github.com/estevamr/syndicat-ontario).
2. **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Branch: **main**, folder: **/docs**.
5. Save. The site can take up to about 10 minutes the first time.

GitHub Pages is public on the internet. Do not put private owner data in this repo.

## Local preview

Open `docs/index.html` in a browser, or from the repo root:

```bash
python3 -m http.server 8080 --directory docs
```

Then visit http://localhost:8080
