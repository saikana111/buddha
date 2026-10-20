# Teaching through an encounter

The dialogue can now unfold over turns instead of compressing every answer into
a definition. The first supported scene presents a concrete image and asks one
focused question. A reply to that question returns to the same image and connects
it with one teaching. Choosing **Continue** permits that connection without
pretending the listener answered or demonstrated understanding.

These are editorial teaching directions, not fixed NPC dialogue, model training,
or claims to reconstruct the historical Buddha's exact speech. The local model
composes the words from retrieved canonical passages. Citations still open the
actual translation. Narrated events are not presented as the AI's memories.

## Corpus-wide teaching methods

`lib/teaching-method.mjs` runs on the installed library, without requiring a
hand-written lesson for each text. It uses the existing full-text index to find
topically relevant passages containing narrative or comparison markers, and
classifies retrieved material as a simile, story, dialogue, verse, or exposition.
The classification is a conservative textual hint, not scholarly attribution.

It gathers up to four whole neighboring chunks from the same document and
translation, within a 12,000-character context bound. It never silently joins
different editions into one story. The window may still be an excerpt; the model
must not invent missing events or an ending. Where no narrative is supported,
it explores a verse image, a dialogue distinction, or technical exposition.
Technical material does not have to become a parable to be teachable.

Generated responses retain the same source-permission and grounding checks.
Reference-only material stays on the quotation path. Explicit tradition filters
remain in effect. New imports become eligible automatically through the existing
library index; no separate training or teaching-index build is required.

The selected source IDs, hashes, method, and stage are saved with the player's
reply. A continuation re-reads those sources and verifies their hashes before
using them. After the application/explanation stage, Continue can advance through
neighboring text in the same edition. Reaching the end is reported rather than
inventing more content.

Run `npm run audit:teaching` to scan all installed passages and write
`data/teaching-method-coverage.json`. The 2026-10-20 local snapshot contained
133,916 passages: 25,310 synthesis-enabled and 108,606 reference-only.
Heuristic form counts: 5,054 simile, 7,910 dialogue, 1,527 verse, 4,766 story, and
114,659 exposition. These count classified passages, not unique stories,
complete works, or verified teaching quality.

## Focused regression examples

The following five cases have additional topic-specific interpretation
boundaries. They are regression examples and optional shortcuts, not the limits
of the system's source coverage.

| Topic | Canonical source | Scene and limits |
| --- | --- | --- |
| Extinguishment, craving, grasping | [SN 12.52](https://www.accesstoinsight.org/tipitaka/sn/sn12/sn12.052.than.html) | A fire with continuing fuel, and a fire with no new fuel. The application concerns craving and its conditions, not self-destruction or suppressing all thought. |
| Insults and anger | [SN 7.2](https://www.accesstoinsight.org/tipitaka/sn/sn07/sn07.002.than.html) | A hostile encounter leads to a question about food guests do not accept. Non-retaliation is not a claim that abuse is harmless. |
| Pain and added distress | [SN 36.6](https://www.accesstoinsight.org/tipitaka/sn/sn36/sn36.006.than.html) | One arrow and a second arrow. The distinction is physical pain and mental distress, not blaming someone for suffering. |
| Ethics and reflection | [MN 61](https://www.accesstoinsight.org/tipitaka/mn/mn.061.than.html) | A mirror leads into examining actions before, during, and after them. No wrongdoing is presumed about the listener. |
| Grasping at teachings | [MN 22](https://www.accesstoinsight.org/tipitaka/mn/mn.022.than.html) | A traveler makes a raft, crosses, then considers carrying it. This does not license abandoning ethical training prematurely. |

Research: Thanissaro Bhikkhu translations hosted by Access to Insight, consulted
2026-10-20. Runtime evidence uses the installed Bhikkhu Sujato passages listed in
`lib/guided-dialogue.mjs`, retaining their own provenance and licenses. The web
translations are research references, not newly copied corpus files.

## Selection and continuity

- English and Spanish topic triggers can nominate a focused example; other topics
  use corpus-wide source selection. Full chunks preserve the surrounding text.
- A focused example's required passages must exist, permit synthesis, contain the expected motif,
  and fit the context bound. No missing ending is invented.
- The encounter key and stage are saved with the existing per-player chat
  response, after source checking and only if a cited invitation actually has a
  question. The existing profile history restores it across page reloads.
- A model classification distinguishes answers to the reflection from new topics.
  Short answers using the current image's vocabulary have a narrow fallback
  when that classifier misses them.
  Explicit Continue is also recognized. A new mapped topic takes priority over
  an old encounter. Classification and grounding checks remain fallible.
- Requests for a brief definition bypass guided encounters. Requests for no story
  can use exposition. The focused examples do not override specific
  Tibetan/Chinese queries or active courses; generic selection respects the
  requested tradition and keeps a structured lesson's topical source selection.
  Retrieval and classification do not guarantee every relevant story is found.

## Reading pace

Ordinary explanations and guided turns have a requested ceiling of 200 words,
with up to three short paragraphs. Casual greetings remain shorter. There is no
minimum that pads a simple answer. The old 40–80 word restriction and the rewrite
step's 80-word ceiling are removed.

The browser displays at most 200 words of teaching text per page. Longer output
and source-only excerpts are split without summarizing, dropping words, or
losing citations. Continue reveals remaining pages before requesting a new model
turn. The user may instead type an answer or change the subject at any point
after the current typewriter animation completes (Show all skips that animation).
Dhammapada verse navigation remains separate. Continue is hidden during
meditation and while a reply is being generated.

The page cursor is not persisted; returning players restore their last response
with the Buddha already seated. Only a profile's first meeting plays the grove
entrance and opening verse. Completion is stored in `players.met_buddha`;
existing configured profiles migrate as already met, and forgetting a profile
resets it. The sprite is decoded before two slow visible/hidden blinks, including
when ambient animation is paused or reduced. The pedagogical encounter
stage is persisted. Automated tests
cover paging, source boundaries, player isolation, continuation, and the
meditation/composer interactions. Local-model samples are qualitative checks,
not scholarly validation or a guarantee of teaching quality.

## Source-first teaching

New substantive questions now prioritize actual source passages. The model
selects up to two relevant IDs; the server copies the stored translation into
quoted dialogue blocks without paraphrasing, shortening, or inventing lines.
Selection favors canonical verses, stories, similes, and dialogues when relevant,
including the Dhammapada. It can select technical exposition when that answers
the question better. The normal 200-word browser pages preserve the full chunks.
This works across eligible imported texts, not just curated examples.

Continue, clarification, and requests to explain the preceding teaching enter
the grounded discussion path. A new topic or request for another quotation
returns to source selection. Social conversation and identity questions retain
their existing behavior. Selection can still be imperfect: citations expose
the edition, speaker metadata, genre, and surrounding context for checking.
An excerpt is not necessarily a complete story, and narrator/disciples' words
are not silently rewritten as the Buddha's own speech.

Spanish profiles see the exact installed English source with a language label
and can ask for explanation in Spanish. These source-first quotes are never
silently replaced by machine translations. Saved responses retain the quoted
text and source IDs; model-generated explanations remain distinct from quotes.

## Depth and faithful reading

During follow-up discussion, an explicit request for depth or technical
distinctions bypasses the introductory encounter selector. New topics still
receive source text first. Detailed exposition keeps
the 200-word window but may continue over further turns; Continue preserves
the depth preference in the saved response. The model is instructed to retain
qualifications and terminology instead of replacing doctrine with motivational
summaries. Grounding and interpretation still require review.

Commands such as **Read MN 61**, **Quote SN 12.52**, or **Recita MN 61** take a
separate reading route. Two ordered source chunks are returned at a time; Continue
first finishes their browser pages and then retrieves the next source chunks.
The reading cursor belongs to the player's saved response. No model is used to
rewrite these readings or translate them automatically. This initial route uses
the installed Sujato English translation, identified in the source popup; it is
not the historical Buddha's recoverable exact English speech. Spanish users
see the existing English-source label. The text retains the import's normalized
formatting; paging does not reconstruct lost verse typography.

Supported explicit reference prefixes are DN, MN, SN, AN, Ud, Iti, Snp, Thag and
Thig, where that translation is installed. Existing Dhammapada verse recitation
continues to work. Missing named readings are reported as unavailable rather
than silently replaced by model-written prose. A new question interrupts a
reading naturally. This is not yet a general whole-book table-of-contents reader.
