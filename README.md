# DataRail Gemini

The page behind [datarail.org/Gemini](https://datarail.org/Gemini/): hello world, drawn as twin
circuit traces on a small board, under the stars of Gemini.

It lives in its own repository so it can grow without being tangled into the rest of the site.

## How it fits together

```
site/ ── publish.yml ──> datarail-site/public/Gemini ── deploy.yml ──> datarail.org/Gemini
          (deploy key)                                    (SFTP)
```

- **`site/index.html`** — the page, in the house style: the Library palette, the shared circuit
  rails from `/assets/circuit.{css,js}`.
- **`site/js/helloworld.js`** — builds the board and runs the animation. No framework, no
  dependencies, no build step.
- **`site/favicon.svg`** — the Gemini sign, routed like a trace.
- **`tools/serve.mjs`** — local preview.

The URL is **`/Gemini` with a capital G**. The web server is case-sensitive, so `/gemini` is a 404.

## The animation

One pass every 13 seconds, the same rhythm as the rails, so the page breathes as one.

| ms | What happens |
|---|---|
| 300 | The signal enters at the board's left edge and splits at a junction. |
| 1100–5500 | Each branch draws one word. `hello` and `world` are five letters each, so they draw letter for letter in lockstep and finish together. Pads pop as the signal reaches them. |
| 5500 | Locked: a white pass sweeps both words, and Castor and Pollux flare. |
| 10400 | Both words fade from the left, and the board waits for the next pass. |

The letters are polylines on a 5 × 10 grid with 45-degree chamfers (`GLYPHS` in
`helloworld.js`), so they are routed the way a board would route them. Every trace is also etched
faintly and permanently, so the signal reads as lighting a track that was always there — the same
rule as the rails. The traces take their colour from `--circuit-echo`, so they change colour with
the rails.

The stars are Gemini's brighter stars at their catalogue positions, plotted north up, joined as
dashed ratsnest lines.

With reduced motion on, the board shows the finished frame: both words lit, nothing moving. With
JavaScript off, it shows the words as plain text.

## Working on it

Needs Node 20 or newer. There is nothing to install.

```bash
npm run serve    # preview at http://localhost:5240/Gemini/
npm run check    # syntax-check the scripts
```

The preview mounts the page at `/Gemini/` exactly as production does, fetches `/assets/*` (the
circuit rails) from datarail.org, and sends every other link to the live site.

## Publishing

Same shape as Movies and the Library. `publish.yml` copies `site/` into
[datarail-site](https://github.com/fvtale/datarail-site) under `public/Gemini/`, and that
repository's own deploy ships it. It is off until:

1. the repository variable `PUBLISH_TO_SITE` is `true`, and
2. the secret `DATARAIL_SITE_DEPLOY_KEY` holds the private half of a write deploy key on
   `fvtale/datarail-site`.

Until then every push still runs the check.
