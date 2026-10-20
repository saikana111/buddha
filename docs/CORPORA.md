# Acquiring and redistributing the teaching library

## Included teaching files

`corpus/cc0/part-*.jsonl` contains actual normalized teaching text, not links or Git LFS pointers. These 4,786 SuttaCentral Bilara records / 13,854 passages are selected from publications explicitly marked CC0. Each document retains translator, source URL, revision, source-file SHA-256 and publication notices. Each passage retains segment identifiers and available original-language alignment. `manifest.json` lists bundle hashes and counts.

```powershell
npm.cmd ci
npm.cmd run import:bundle
```

This creates the local searchable SQLite library. The corpus remains under CC0, independently of the app's PolyForm Noncommercial license. No additional noncommercial restriction is imposed on CC0 teaching text. See https://creativecommons.org/publicdomain/zero/1.0/ . This bundle is a normalized representation; original source files can be acquired below.

The SuttaCentral publication notices include publisher preferences concerning AI use. Those notices remain in metadata; this app must not imply publisher endorsement. Redistribution permission and a publisher's wishes are distinct matters. The app uses retrieval, not model-weight training.

## Download the expanded collection

For a new Windows installation, `powershell -ExecutionPolicy Bypass -File .\setup.ps1` is the standard path: it handles dependencies, this expanded import, the local model and launch in one command. Install Node.js and Ollama first. It uses every currently supported source, subject to the rights filters below; it cannot supply missing translations or entire unimplemented canons.

```powershell
npm.cmd run import
```

The command runs `scripts/sync-sources.mjs`, then the legacy and story downloaders, then the index builder. It downloads directly from upstream public endpoints. No account or paid subscription is needed for these endpoints; GitHub may rate-limit unauthenticated requests. It retains original archives and extracted files under ignored `data/sources/`.

| Collection | Upstream | Acquisition and local files |
| --- | --- | --- |
| Bilara translations and aligned roots | https://github.com/suttacentral/bilara-data | Commit ZIP from GitHub codeload; `data/sources/bilara-data-COMMIT/` |
| Tibetan translations | https://github.com/84000/data-tei | Commit ZIP; `data/sources/data-tei-COMMIT/` |
| Legacy Khuddaka, Abhidhamma and parallels | https://github.com/suttacentral/sc-data | Exact HTML paths fetched from raw.githubusercontent.com; `data/sources/{khuddaka,abhidhamma,parallels}/COMMIT/` |
| Dhammapada commentary stories | https://ancient-buddhist-texts.net/English-Texts/Buddhist-Legends/index.htm | Linked story pages plus copyright notice; `data/sources/buddhist-legends/` |

Fresh installs use the five committed revision/file manifests in `docs/source-locks/`. Bilara and 84000 ZIP hashes are checked. Legacy manifests pin the commit and individual paths; generated document metadata records content hashes. Existing local revision manifests take precedence.

The story website has no immutable revision API here: its current linked pages are downloaded once and cached, with per-page hashes recorded locally. Consequently the expanded build is not guaranteed byte-for-byte reproducible across dates. Current coverage numbers describe the development snapshot, not a promise about future upstream availability.

```powershell
# Rebuild from already downloaded originals, without network:
npm.cmd run index
# Deliberately refresh GitHub revisions, download and rebuild:
node scripts/sync-sources.mjs --update
```

`--update` refreshes GitHub sources, not cached story pages. Old archives remain on disk. Stop the app first. Back up private player data separately. Import transactions protect existing indexed tables if parsing fails; downloads can fail before indexing without replacing the library. Retry the same command after a transient failure. Incomplete `.partial` downloads are not imported. Do not bypass checksum mismatches; investigate upstream archive changes or damaged downloads first.

## Segment integration and concept links

The expanded import builds `canonical_texts`, `canonical_segments`, `canonical_links` and an FTS5 Pāli search index. This snapshot contains 7,288 text records and 420,790 nonempty body segments. One Vinaya grouping file contains headings only and contributes no body segments. The index keeps source order, source URL, revision and original-file SHA-256.

191,100 Pāli segments have a link to at least one imported English Bilara passage through an exact shared segment ID. These are passage-level alignments, not sentence-level translations. Heading segments and blank source values are excluded. Legacy HTML translations without shared segment IDs remain in the English library but do not count as aligned. Neither a matching text ID nor an aligned passage proves that an entire translation is complete.

`npm run index:canon` rebuilds the original-language index from the acquired Bilara snapshot. `npm run index:concepts` validates and persists the authored concept graph against current source passages. Graph builds reject missing quotations and references disabled for synthesis; retrieval drops stale edges if a passage hash changes.

The source popup offers adjacent passages from the same translation, aligned Pāli segments, and proposed concept connections with their evidence. English/Spanish concept aliases nominate source passages for dialogue retrieval. The relationship labels themselves are unreviewed and are not supplied to the LLM as established doctrine. Historical accounts remain a separate layer; no inference of historical influence or transitive causation is generated.

Read-only local endpoints: `/api/canon` (per-book segment coverage), `/api/canon/search?q=anapanasati` (Pāli search; optional `book`), `/api/canon/text?uid=mn118&offset=0` (30 ordered segments per page), `/api/context?id=sc:sujato:mn118:1`, and `/api/concepts?q=craving`. The concept endpoint defaults to canonical-teaching links; `layer=historical-context` explicitly selects reported historical accounts. The bundled edition has concept links and surrounding English passages; full Pāli segmentation requires the expanded import.

## Rights and selection

The app's license applies to original app material only. It cannot grant rights over someone else's translations or replace their terms.

- CC0 publications are bundled with provenance.
- CC BY-SA material requires attribution and its own license; adaptations must satisfy share-alike. It is not bundled in this first release.
- 84000's acquired CC BY-NC-ND 3.0 texts permit attributed noncommercial redistribution subject to the license, but not distribution of adaptations. The app currently downloads these separately and uses reference excerpts; it does not generate paraphrases from them.
- Custom free-distribution grants retain their full notices and stay reference-only. Unknown or unmatched rights are excluded from indexing.
- Downloaded does not mean indexed, and indexed does not automatically mean cleared for bundling. See the skipped paths/reasons in generated `data/coverage.json`.

License references: https://creativecommons.org/licenses/by-sa/3.0/ and https://creativecommons.org/licenses/by-nc-nd/3.0/ . Source-specific research and unresolved coverage are in [CANON-RESEARCH.md](CANON-RESEARCH.md) and `sources.json`.

The full Chinese Taisho, a complete English Tipitaka and all Kangyur/Tengyur translations are not included. VRI originals investigated locally are not part of the automated builder. No automatic translation project or trained model is delivered.

## Maintainer export

`node scripts/bundle-corpus.mjs` regenerates the CC0 bundle from an already indexed library. It queries only documents and passages, never player tables. Review changed publication notices and bundle contents before release. Do not copy `data/library.sqlite`: that database also contains private profiles, conversations, plans and meditation logs.
