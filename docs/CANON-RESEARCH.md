# Canon research and source decisions

Researched 2026-10-19. The goal is broad, traceable context for a local teaching companion. A larger library does not by itself make an AI enlightened or doctrinally authoritative.

## Major textual collections

**Pāli / Theravāda:** Sutta, Vinaya, and Abhidhamma are distinct collections. The Dhammapada belongs to the Khuddaka Nikāya and is a central reading path here. SuttaCentral provides aligned Pāli and translations, plus parallels from other early Buddhist traditions. Its published data is a practical bulk source, but English availability is not identical to full canonical coverage. The app's actual coverage, rather than the repository name, determines what it can use.

**Chinese / East Asian:** Chinese collections preserve Āgamas, Mahāyāna sūtras, Vinayas, Abhidharma, treatises, and further literature. CBETA's Taishō and supplementary collections are much broader than the 75 Chinese-canon English translation records currently imported. Japanese and Korean canonical editions are important witnesses within this wider textual world; it would be misleading to count the same translated text repeatedly as independent teachings. CBETA's original-language holdings require their own adapter, rights exceptions, and a trustworthy English translation layer for this English app.

**Tibetan:** The Kangyur contains scriptures traditionally treated as the Buddha's teachings; the Tengyur contains treatises and commentaries. Their genre distinction is preserved. 84000 provides human English translations and a public TEI repository. The app imports identifiable published translation bodies from that snapshot. The repository is incomplete and older than the live reading room, so it is not a complete Tibetan canon.

**Indic textual witnesses:** Sanskrit, Prakrit, and Gāndhārī materials include important parallels and fragments, not one interchangeable unified canon. The current English Indic-parallel records are from the Prakrit Dhammapada collection in Bilara. More languages in the downloaded source archive do not mean those texts have been integrated into English answers.

## Primary sources

- SuttaCentral data model and publication workflow: https://github.com/suttacentral/bilara-data
- SuttaCentral methodology and parallels: https://suttacentral.net/methodology
- Bilara repository license: https://github.com/suttacentral/bilara-data/blob/published/LICENSE.md
- Per-publication metadata: https://github.com/suttacentral/bilara-data/blob/published/_publication.json
- CBETA collections and rights statement: https://archive2.cbeta.org/copyright.php
- CBETA source XML: https://github.com/cbeta-org/xml-p5
- 84000 TEI and repository license: https://github.com/84000/data-tei
- Kangyur versus Tengyur: https://84000.co/post/q-a-publishing-translations-from-the-tengyur
- 84000 scope and translation goals: https://84000.co/about/faq
- 84000 current reading room: https://84000.co/reading-room
- 84000 draft terms (explicitly labeled DRAFT): https://www.84000.co/documents/terms-of-use
- 84000's position on AI translation: https://84000.co/documents/84000s-position-on-ai-and-the-machine-translation-of-canonical-literature

## Reuse distinctions retained by the implementation

Bilara's general license describes CC0 translations, but individual publication metadata must still be checked. The importer found a CC BY-SA 3.0 Prakrit parallel translation and records that instead of incorrectly labeling everything CC0. Some CC0 publication statements include a translator's request not to use the work in AI technologies. That request is retained verbatim in the provenance; it is distinct from the CC0 dedication. This implementation uses retrieval context and does not perform weight training. Retrieval remains an AI use, so the existence of that request is not concealed or described as inapplicable.

84000's repository states CC BY-NC-ND 3.0; newer draft website terms mention 4.0 for published translations and different terms for metadata. The app records the actual repository license and keeps those texts reference-only, attributed, local and noncommercial. It does not assume that a draft web policy relicenses older repository files. Original TEI is retained, and excerpt formatting is explicitly documented. The importer uses the public repository, not an undocumented or private API. No author or organization has been contacted.

CBETA generally specifies CC BY-NC-SA 3.0 Taiwan with exclusions, attribution/version obligations, and noncommercial conditions. It is researched but not bulk-imported in this version. A public GitHub repository is not treated as blanket permission to relicense its contents.

## Remaining work

Expand Chinese English translations and source-specific adapters; obtain current Tibetan source access when needed; add missing Abhidhamma and other collections with suitable provenance; improve context windows and dense retrieval; evaluate with reviewers familiar with multiple Buddhist traditions. Build training data only after these foundations are reliable and source reuse is explicitly reviewed. Preserve differences instead of having the model invent a single universal doctrine.


## Khuddaka expansion and character delivery

Imported the available English legacy Khuddaka collections from the official SuttaCentral data repository, pinned to the same revision as the Abhidhamma import: https://github.com/suttacentral/sc-data/tree/2d9ca8da858f94302ed6783e2717bf73d651881b/html_text/en/pli/sutta/kn . Publication footers preserve translator, rights declaration, edition notes, and proofreading caveats. Of 1,941 downloaded files, 1,660 met the current import rules; skipped paths and reasons are recorded in data/coverage.json. The Jataka collection contains both canonical verses and narrative commentary, which is explicitly marked in model context.

The character layer uses a structured system profile, an approach supported by Ollama system instructions: https://github.com/ollama/ollama/blob/main/docs/modelfile.mdx . It changes conversational delivery while current retrieved passages remain the evidence. Style references: https://suttacentral.net/mn58/en/sujato , https://suttacentral.net/mn61/en/sujato , https://suttacentral.net/sn7.2/en/sujato . These are English translations, not evidence of the exact historical phrasing or voice. No weight training is performed.


## Prose rights notices and remaining gaps

Expanded the legacy parser to recognize explicit Creative Commons Zero dedications without a URL, plus the full ATI and BPS free-distribution grants. Custom grants are reference-only and their full notices are retained with every source record. See https://accesstoinsight.org/faq.html#copyright for the publisher?s explanation; individual source notices control the import. Current Khuddaka count is 1,894 of 1,941 downloaded files; Abhidhamma is 400 of 401.

Sutta Friends offers permission to share individual suttas (https://suttafriends.org/copyright/), but this was not treated as blanket permission to import its entire collection. Buddhavamsa, Niddesa, much of Patthana, and additional Vimanavatthu/Petavatthu coverage remain open research gaps. GRETIL Buddhavamsa material located in this pass is Pali, not a new human English translation.


## Acquisition map: beyond the Dhammapada

The aim is a broad, traceable library, not to count all translations or all traditions as a single historical speaker. Priorities below are a project recommendation; inventory counts are taken from the local database, not inferred from a publisher's marketing claims.

| Priority | Material | Why it matters | Current direction |
| --- | --- | --- | --- |
| 1 | Digha, Majjhima, Samyutta, Anguttara Nikayas; Chinese Agama parallels | Sustained conversations, meditation, ethics, dependent arising, liberation, household life | Four Pali collections already indexed; acquire additional verifiable parallel translations |
| 1 | Sutta Nipata, Udana, Itivuttaka, Theragatha, Therigatha | Early verse teachings, short teachings with narrative frames, monks' and nuns' experiences | Already present; retain speaker attribution and alternative translations |
| 2 | Jataka, Apadana, Cariyapitaka, Buddhavamsa, Vimanavatthu, Petavatthu | Stories, exemplary conduct, traditional past-life narratives, karmic accounts | Jataka and most Apadana present; Buddhavamsa and much of Vv/Pv remain English gaps |
| 2 | Vinaya: Suttavibhanga, Khandhaka, Parivara; other-school Vinayas | Origin stories for rules, community life, conflict resolution and monastic practice | Pali source inventory represented; add licensed parallels with audience/context labels |
| 3 | Seven Abhidhamma books; Niddesa; Patisambhidamagga, Netti, Petakopadesa, Milinda | Precise conceptual distinctions and systematic exposition | Existing partial English holdings; Patthana and Niddesa remain major gaps; canonical boundaries vary |
| 3 | Mahayana sutras: Prajnaparamita, Lotus, Vimalakirti, Pure Land, Avatamsaka sections, Golden Light, Lalitavistara | Bodhisattva teachings, emptiness, skillful means, narrative and devotional traditions | Many already in 84000 snapshot as reference excerpts; check each title, not just collection names |
| 4 | Dhammapada commentary, other atthakatha, biographies and later treatises | Story context and traditional interpretation | Separate commentary layer; never relabel as early canonical discourse |

Core teaching index to curate: SN 56.11 (four truths/path), SN 22.59 (not-self), SN 12 (dependent arising), MN 10/DN 22 (mindfulness), MN 118 (breathing), MN 117 (path), MN 58 (speech), MN 61 (reflection on actions), SN 7.2 (insults), MN 86 (Angulimala), DN 31 (household relationships), AN 3.65 (Kalamas), Snp 1.8 (loving-kindness). These are index targets in holdings already acquired, not claims of new downloads. Preserve complete context rather than turn short extracts into universal rules.

Primary research sources:
- SuttaCentral methodology and parallel relationships: https://suttacentral.net/methodology
- Pali Translation Project: https://palitranslation.org/ . Its page identifies human translation and digitization gaps; some project lists are older than our current holdings, so they are not used as a live completeness oracle.
- BDK English Tripitaka title catalog: https://www.bdkamerica.org/tripitaka-list/ . PDFs are free for personal study, but free download is not treated as blanket database/retrieval permission: https://www.bdkamerica.org/free-pdf/ . Listed for acquisition review; no email was sent.
- 84000 current catalog: https://84000.co/reading-room . Our pinned public TEI edition is older and incomplete.
- Ancient Buddhist Texts story collection: https://ancient-buddhist-texts.net/English-Texts/Buddhist-Legends/index.htm . Acquired the 306 story-page digital edition 1.5, explicitly noting that the publisher links a newer revised edition. Original Burlingame translation is declared public domain; editorial material follows the site's CC BY-SA 3.0 notice: https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm . Reference-only in this app.
- Niddesa candidate https://github.com/zautumnz/niddesa describes its output as patchy, incomplete machine translation. Excluded as an authoritative teaching source; a software license does not establish translation quality.
- Dharma Pearls https://canon.dharmapearls.net/copyright.html contains an explicit AI-use objection. Legacy files without a recognized grant remain excluded. Existing separately CC0-published SuttaCentral editions retain their recorded publication licenses; no new permission is inferred from a site being publicly readable.

The new parallel download contains 879 source files. Downloaded files are an acquisition archive; only items passing provenance and rights checks are searchable. The distinction is recorded in the import report. The source corpus is not weight training and does not automatically improve the model's reasoning or guarantee doctrinal accuracy.

## Evidence-linked reasoning pilot

Run `node scripts/build-knowledge-map.mjs` to rebuild `data/knowledge/pilot.json` and the bounded craving traversal example. The current map has 35 nodes and 25 agent-authored, unreviewed relationships. Every edge carries an exact evidence excerpt, passage ID, segment IDs, translation attribution, license, and passage hash. Missing or changed excerpts stop the build. This validates provenance, not the correctness or completeness of interpretation.

Canonical teaching links and historical-context reports occupy separate layers. MN 26 links the named teachers to the attainments described in that account. DN 2 edges explicitly attribute reports of other teachers to Ajatasattu within a Buddhist text; they are not independent evidence of those schools' positions. No historical borrowing or influence is inferred. Multi-hop traversal preserves individual edges without inventing transitive causal claims. These relationships now nominate source passages for live dialogue retrieval. Only the original passages, not the unreviewed relationship labels, are supplied as evidence. They do not change model weights.

Architecture direction: combine passage retrieval with curated concept/term links, discourse context, verified parallel relationships, and tradition-specific interpretation. Keep machine-extracted candidate edges and translation drafts out of the accepted evidence set until reviewed. Evaluate source accuracy, speaker attribution, cross-tradition distinctions, misleading questions, and unsupported inference on held-out questions before changing live retrieval. Only then consider fine-tuning on reviewed reasoning examples. The intended benefit is more reliable evidence selection and comparison, not a claim of enlightenment or superhuman comprehension.

Research: Microsoft's GraphRAG documentation describes local entity/relationship retrieval alongside source chunks and global community-summary search: https://microsoft.github.io/graphrag/query/overview/ . This is an architectural reference; the Microsoft package is not installed here. Historical source entry points: https://suttacentral.net/mn26/en/sujato and https://suttacentral.net/dn2/en/sujato . The local pinned translations supplied the pilot evidence. Early Brahmanical and Jain materials remain acquisition/research targets; dating, textual layers, permissions, and the difference between a school's own sources and outside reports must be recorded.
