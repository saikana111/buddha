# Build and run

Install Node.js 22.13 or newer (including npm), Git, and Ollama. The full corpus downloader also requires `tar` on PATH; Windows includes it. No frontend compiler, paid API key or cloud inference service is required.

```powershell
git clone https://github.com/saikana111/buddha.git
cd buddha
npm.cmd ci
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The Windows setup installs locked dependencies, downloads and indexes the expanded corpus, acquires the local model and starts the app. `npm ci` is also performed by setup, so it can be omitted above. Rerunning setup reuses completed source files and installed model data. Stop an existing app instance before rerunning. Use `-BundledOnly` for the smaller included corpus, `-NoLaunch` to only install, or `-Model MODEL` to select another local Ollama model.

Open http://127.0.0.1:3000. On other operating systems, run `npm ci`, `npm run import`, `ollama pull qwen3.5:4b`, then `npm start` with `ollama serve` running separately. Set `OLLAMA_NO_CLOUD=1` for the Ollama process. The server binds to localhost and expects port 3000; it is not prepared for public multi-user hosting.

The bundled corpus imports without internet. Installing npm packages and acquiring the model require internet initially. Model weights and Ollama are not included. `BUDDHA_MODEL` selects another locally installed model; compatibility and response quality must be tested. The default prefers `qwen3.5:4b`, then `qwen2.5:3b`. Allow several GB for the model and additional space for expanded source archives. CPU inference works but may be slow.

## Corpus choices

`npm run import:bundle` installs the included CC0 text files: 4,786 records and 13,854 passages, including all 423 Dhammapada verses. It verifies SHA-256 hashes and imports only document/passage data. It does not overwrite player tables.

`npm run import` downloads additional corpora and builds the broader library. See [CORPORA.md](CORPORA.md) for sources, exact revisions, permissions, offline rebuilding and recovery. The broader development library has 7,725 records and 133,916 passages; the bundled edition intentionally has less coverage.

Both import paths also build the evidence-linked concept map. The expanded import additionally indexes Pāli source segments. To upgrade an existing installation without downloading/rebuilding its entire translated library, stop the app and run `npm run index:canon` followed by `npm run index:concepts`; then restart. The first command needs the already acquired Bilara archive. Both update only library indexes, preserving player data.

## Verification and maintenance

```powershell
npm.cmd test
node --check server.mjs
```

Tests use temporary player databases. Some full-library tests require the expanded corpus; the bundled edition does not contain every tradition. Stop the app before imports, upgrades or backups. Keep a private backup of `data/library.sqlite` and its SQLite sidecars while the app is stopped if player history matters. Never publish that database.

Profiles, conversation history, study plans and meditation sessions persist locally. The browser cookie is an opaque profile identifier; keep the same hostname and browser to return to the profile. Profile forgetting clears the associated personal records. The app has no cross-device login or recovery.

`public/` is served directly; there is no generated `dist/` directory. Included PNG and WAV files are actual assets. Their generation prompts, source research and implementation context are committed under `docs/`. Private keys, models, runtime executables, downloaded source archives and player databases are excluded.
