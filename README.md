# Beneath the Bodhi Tree

A local English/Spanish Buddhist dialogue app: an animated cel-shaded 2D scene, a dialogue panel, and a message field. No dashboard, status badges, or explanatory footer. Small citation buttons open source passages only when requested.

The model receives relevant canonical context before answering. This is retrieval-augmented generation, not weight training, reinforcement learning, awakening, or a recreation of the historical Buddha's mind. Generated explanations and stored source excerpts are separate.

## Build and run

See [the build guide](docs/BUILD.md) and [corpus acquisition guide](docs/CORPORA.md).

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Install Node.js 22.13+ and Ollama first. Open http://127.0.0.1:3000. Setup downloads the expanded teaching library and local model, then launches the app. Use `setup.ps1 -BundledOnly` for the smaller included CC0 library. Profiles and history persist in local SQLite; they are never part of the published repository.

This is a free, noncommercial project under [PolyForm Noncommercial 1.0.0](LICENSE), not a registered nonprofit claim. Bundled teaching texts retain CC0 independently; see [NOTICE](NOTICE). Original app code, actual art/audio, prompts, build instructions and [project context](docs/PROJECT-CONTEXT.md) are included.

Try:

- “I am angry at someone who insulted me. How can I respond?”
- “Read the Dhammapada” — begins at verse 1; Continue advances through 423 verses.
- “Explain Dhammapada verse 5.”
- “What does the Chinese canon teach about impermanence?”
- “What does the Tibetan canon teach about compassion?”

Enter sends; Shift+Enter adds a line. Replies reveal gradually, with Show all and reduced-motion support. Input is enabled when the reply finishes. Follow-up questions use the last three turns of context.

## Library and coverage

The expanded development library contains **7,725 text/translation records and 133,916 passages**. The included CC0 bundle contains **4,786 records and 13,854 passages**; use `npm run import` to acquire the broader sources:

| Source tradition | Text/translation records | Current coverage |
| --- | ---: | --- |
| Pāli | 7,311 | Available English discourses, verse collections, Vinaya and other texts in the selected SuttaCentral snapshot |
| Chinese | 76 | English Āgama translations in SuttaCentral |
| Indic parallels | 56 | Prakrit Dhammapada parallel collection |
| Tibetan | 282 | Published 84000 translations identifiable in the public TEI snapshot, including Kangyur and Tengyur |

These are not unique teachings: parallel versions and alternate translations count separately, and the different sources have different passage granularity. The complete 423-verse Pāli Dhammapada is independently verified and prioritized when relevant. Pāli and other available original-language segments are retained alongside their English translations.

This is **not every traditional canon**. In particular, the entire Chinese Taishō, a complete English Abhidhamma, and complete Kangyur/Tengyur translations are not present. The public 84000 repository is older than its live reading room. The importer excludes drafts, unrecognized metadata, and unverified licensing, recording each skipped path and reason in `data/coverage.json`. Duplicate Tibetan catalog IDs retain the newer available edition.

See `sources.json` and `docs/CANON-RESEARCH.md` for source scope, research, and gaps. Source archives and extracted originals remain in `data/sources`.

## Ingest and update

```powershell
npm.cmd install
npm.cmd run import
npm.cmd run index
npm.cmd test
```

`import` downloads pinned official repository snapshots if needed and builds the database. `index` rebuilds from downloaded files without internet. To explicitly refresh source revisions, use `node scripts/sync-sources.mjs --update`, then restart the app. Downloads keep originals; builds replace the database contents transactionally so failed imports roll back. Updates currently rebuild the whole index, rather than applying incremental diffs. Archives and old snapshots are retained; monitor disk space before updating.

Every source record retains its translator, license, original source URL, revision, SHA-256, tradition, and segment identifiers. Bilara JSON is joined by stable segment IDs. TEI is parsed in document order; inline wording is preserved, whitespace normalized, and editorial notes excluded from quoted body passages. Full originals remain available for inspection. Published status values 1 and 1.a are defined by 84000's bundled schema.

## Answer architecture

1. A local LLM resolves the question and follow-up context into search terms.
2. SQLite FTS5/BM25 retrieves text using lexical search, topic synonyms, and LLM-expanded terms. Relevant Dhammapada verses get additional priority; explicit verse requests bypass inference.
3. The model receives a small selection of source passages, with their traditions and titles, then writes a concise explanation with constrained source IDs.
4. The backend rejects invented source IDs and unsupported output shapes. A second model pass checks each explanation paragraph against its cited text and discards unsupported paragraphs. If that review keeps none, source excerpts are shown instead.
5. Citation buttons display stored source wording, attribution, source links, original-language alignment where available, and edition details.

The second model pass reduces unsupported extrapolation but **does not prove doctrinal accuracy or semantic entailment**. Source IDs and stored quotation wording are enforced by code; explanation accuracy and source relevance still need expert evaluation. Retrieval is not yet a dense-embedding index. Original-language texts are not automatically translated. The model is instructed to distinguish traditions and not attribute every narrator, disciple, or commentary to the Buddha.

84000 files are currently a reference-only collection: the app selects and displays attributed excerpts but does not train on or generate paraphrases from them. CC BY-SA parallel texts are likewise reference-only in this initial version. When other permitted sources are available, the generated explanation draws from those permitted sources. This is a conservative implementation choice, not a blanket legal conclusion about all AI uses.

## Hardware and verification

- Ryzen 7 5700G, about 27.9 GiB usable RAM, Radeon RX 6600 with 8 GiB VRAM.
- Ollama 0.40.6 portable CPU/Vulkan runtime. Qwen 3.5 4B is installed and runs on GPU; approximately 3.36 GB VRAM reported with 8,192-token context.
- Meaningful tests cover all 423 verses, retrieval across traditions, XML inline-text order, published/draft exclusion, verse chunking, and citation restrictions.
- Live inference tests cover anger, a follow-up, Dhammapada explanation, Chinese impermanence, Tibetan compassion, and unrelated-question handling. `data/dialogue-smoke.json` records the latest run. These checks are not a doctrinal benchmark.
- HTTP checks cover the page, script, stylesheet, generated image, and verse endpoint bounds. No connected browser surface was available for visual browser QA.

## Artwork

The new scene was created with the built-in ImageGen tool and saved as `public/assets/bodhi-dawn.png`. Its complete prompt is recorded in `docs/IMAGE-PROMPT.txt`. It is an artistic anime depiction, not a historical reconstruction.

## Cel-shaded encounter

Two original illustrated layers evoke older Japanese supernatural RPGs: a transparent Buddha character over a bodhi-tree landscape. Local CSS animation provides subtle breathing, floating light and a halo that responds during dialogue. This is an animated illustration, not skeletal animation or lip sync. Click the scene or press Space while focused to pause; reduced-motion preferences start paused. The artwork is in `public/assets/buddha-cel.png` and `public/assets/bodhi-cel-background.png`. Generation prompts are in `docs/CEL-ART-PROMPTS.txt`.

## Expanded Pali library and dialogue voice

The legacy SuttaCentral importer now includes 1,894 Khuddaka translation records (7,654 passages) and 400 Abhidhamma records (5,887 passages). Added collections include 547 Jataka records, 248 Milinda sections, 561 Therapadana and 40 Theriapadana records, 37 Netti sections, 9 Petakopadesa sections, and 31 Patisambhidamagga sections. Jataka prose includes commentary; these records are not all direct Buddha sermons. Additional Dhammapada translations do not replace the verified 423-verse reading sequence.

The original Pali inventory has 7,288 files across all three baskets. `data/tipitaka-coverage.json` reports file-ID matches, not verified line-by-line completeness. Major remaining English gaps include Buddhavamsa, the two Niddesa collections, Vimanavatthu, most Petavatthu, and most Patthana. Publication notices without a recognized reuse license remain excluded from the searchable library.

`lib/persona.mjs` defines an immersive dramatic portrayal: direct address, measured English, occasional reflective questions, and source-backed similes. Its teaching habits are informed by MN 58, MN 61, and SN 7.2. This is a prompt-based character profile with retrieved evidence, not fine-tuning or a reconstruction of the historical voice. English wording reflects translators. The source popup distinguishes generated dialogue from quotations.

## Viewport fitting and further imports

The encounter uses a viewport-height grid: scene, scrollable dialogue, then an always-visible composer. It adapts to short windows and mobile keyboards without requiring zooming out. No connected browser was available for visual verification.

The importer now recognizes explicit prose CC0 declarations and the reviewed ATI/BPS free-distribution grants. Custom grants remain reference-only with their complete notices preserved. This adds 237 records and 484 passages, including the three Sujato Dhammasangani matrix sections and John Ireland?s 112 Itivuttaka translations. Unknown permissions remain excluded; English canon coverage is still incomplete.

## Narrative context and acquisition research

Added 306 Buddhist Legends story pages (1,476 passages) as Dhammapada commentary and 35 additional canonical parallel translation records (209 passages). The other 844 downloaded parallel files remain unindexed pending adequate publication/rights evidence. Ask ?Tell me the story behind Dhammapada verse 5? to retrieve linked commentary. Source excerpts retain commentary labels, authorship and rights information.

The acquisition map in `docs/CANON-RESEARCH.md` covers discourses, Agama parallels, story collections, Vinaya, Abhidhamma, Mahayana sutras, and commentaries. `data/library-catalog.json` gives the current collection inventory and selected major titles. No claim of worldwide-largest or complete-canon coverage is made.

## Local player memory and living scene

The browser receives a random `bodhi_player` cookie (HttpOnly, SameSite=Strict, persistent); the cookie contains only an opaque ID. Profile details and completed conversations are stored in the local SQLite `players` and `player_chats` tables. Different cookies get separate players. Use the same browser and hostname to return to the same profile. Clearing cookies creates a new player on the next visit; no cross-device account recovery is implemented.

The small profile button opens editable name, practice focus, self-described knowledge, tentative topic notes, and recent conversations. Forget removes that player's profile contents and conversation rows. The model receives recent turns, bounded topic evidence, and up to three relevant older user messages selected by keyword overlap. This is selective recall, not complete recall of every conversation. No model-weight training is performed. Difficulty detection is a conservative keyword heuristic; understanding remains unassessed. A later explicit statement of understanding can clear the topic's review flag. Stated goals and corrections guide the response, while teachings must still be supported by canonical passages.

The scene follows browser-local time: sunrise 05:00-07:00, morning 07:00-11:00, midday 11:00-17:00, sunset 17:00-20:00, night otherwise. These are artistic clock phases, not latitude/season-specific astronomical sunrise and sunset. Color grading, light, clouds, falling leaves, intermittent canopy sway, and phase-specific symbols extend the existing cel illustration. Lamp/light: Dhammapada 387; lotus: 58-59; eight-spoked wheel: SN 56.11; falling leaf/impermanence: 277; moon emerging from clouds: 382. These are artistic associations, not claims that the texts prescribe those scene designs. Clicking the scene pauses animation; reduced-motion preferences disable it. No new text is added to the dialogue for phase changes.

Validation: `npm.cmd test` includes cookie identity persistence across database reopening, isolation between players, selective recall, tentative review-flag updates, and phase boundaries. Live API checks also exercised profile editing, persisted recitation, local-model reply storage, and forgetting. Browser visual QA remains pending when no browser surface is connected.

## First-visit setup and language

New cookie-linked players complete a username and English/Spanish selection before chatting. Both choices persist in SQLite; named existing players migrate as configured English users without losing chats. Language remains editable in the profile. Forgetting resets onboarding. Spanish is used for the primary interface and model responses; original source excerpts remain intact. Eligible excerpt-only replies can include separately labeled AI-assisted Spanish translations, not new authoritative editions. Restricted sources remain in their acquired language. Current local-model factual and translation checks are imperfect; successful language switching is not scholarly translation validation.

The active retro artwork is `public/assets/buddha-retro.png` and `public/assets/bodhi-retro-vivid.png`. The latter replaces the earlier lake panorama with a vivid grove and lotus pool. Prompts and generation method are recorded in `docs/RETRO-ART-PROMPTS.txt`. CSS reduces glow and preserves saturation across the five time phases. Tests cover onboarding flags, username/language validation and migration. Live checks exercised a fresh cookie, Spanish verse rendering, Spanish dialogue, and resetting the profile. Browser visual QA remains unavailable in this session.

## Short concept prompts

A single word or short phrase now reaches source retrieval even if the model's relevance classifier incorrectly rejects it. The planner treats such input as a request for a related concept or teaching, translates Spanish search terms, and gives the current message priority over earlier generic refusals. Immersion/inmersion, concentration/concentracion, samadhi and absorption link to meditation search terms; SN 45.8's explanation of right immersion is prioritized within the applicable Pali/all-traditions scope. This is a related-term map, not a claim that every term is interchangeable in every tradition. Short-prompt synthesis that cannot be supported falls back to a retrieved source excerpt rather than another generic invitation. Explicit unrelated tasks retain the scope check. Regression tests cover classifier rejection, English/Spanish/diacritic variants, the full definition, and tradition filtering.

## Persistent learning plans and comprehension checks

Explicit requests such as "I want to study the Dhammapada this week" or "Quiero aprender sobre la atención plena hoy" save a player-owned plan with topic, requested timeframe, local start date, current step, source IDs, and progress. Today/this week records intention rather than imposing a completion deadline. Dhammapada plans cover all 423 verses exactly once in groups of at most two, respecting chapter boundaries. Other topics use a provisional 2-6-step introductory sequence proposed by the local model from retrieved passages, with all IDs validated against those candidates. This is not a guarantee of complete coverage or expert-approved sequencing.

Each lesson focuses on one concept and asks for an explanation in the learner's own words. "Yes" does not establish comprehension or move the cursor. A substantive answer may receive a provisional model assessment supported by an exact excerpt from that answer; this is not a validated mastery measure. "Next" advances on request and records unassessed steps as skipped. "Pause my plan", "resume my plan", and "review my plan" preserve or revisit progress. The profile lists saved plans and offers resume/review controls. Explicit teaching preferences such as "I prefer short lessons" are retained as user context. Ordinary unrelated questions do not automatically replace the active study goal.

## Hourly meditation

Onboarding and profile editing ask for meditation minutes per hour (1-60). The app chooses a time within each elapsed hourly window while the page is open, waits for a quiet moment, then starts the sitting automatically with a bell, dialogue and closed-eye avatar. There is no manual start button. Pause/resume and end controls remain available. It waits while a reply, modal or unsent draft is active. Missed hours are skipped, not accumulated as catch-up sessions. The timing is an app scheduler, not an LLM claim about the player's needs.

Duration and schedule persist per profile. Each hour can initiate at most one sitting, including reloads and multiple tabs. Settings changes affect subsequent sittings, not the active timer. Old daily settings migrate to hourly duration (capped at 60 minutes). Closed/hidden pages do not initiate sittings; an already running timer continues its wall-clock duration. Logged minutes are timer activity, not proof of practice. Daily totals remain available.

The sound settings offer silence, a recorded temple bell, or temple bell with singing bowls, a soft synthesized flute-like accompaniment and breeze. The actual recordings and licenses are documented in [AUDIO-SOURCES.md](docs/AUDIO-SOURCES.md), with attribution also inside the app. Audio needs one ordinary user gesture after loading to satisfy browser autoplay rules. No universal Buddhist frequency is claimed. Browser listening/visual QA remains pending when no browser surface is connected.
