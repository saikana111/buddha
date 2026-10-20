# Project context and current limits

The intended encounter is a dignified Buddhist dialogue game: picture, spoken dialogue, then the player's input. The visual direction is vivid, restrained retro Japanese supernatural RPG art, with an original Buddha portrayal. The scene uses browser-local clock phases, subtle wind/leaves, reduced-motion support and a closed-eye meditation sprite.

The user wants a very broad, source-grounded library with particular emphasis on the Dhammapada. Actual source quotations stay distinguishable from generated dialogue. The current implementation uses local Ollama inference and SQLite lexical retrieval; it does not train or awaken a model. Historical speakers, canonical verses, later commentary and different traditions must remain distinguishable.

English/Spanish onboarding and cookie-linked local profiles persist conversation context, explicit preferences and study plans. Plans teach one concept at a time and ask comprehension questions. Assessment is provisional; assent alone is not mastery. Daily meditation goals, reminders while the page is open, pause/resume timers and original bell/breeze audio are implemented.

The inquiry prompt encourages careful examination, concrete questions and respectful challenges to claims, including skepticism. It must not coerce belief, invent personal flaws, assign spiritual attainment or claim that the AI is actually awakened. Direct identity challenges have a deterministic honest response. Grounding review is still another model judgment and can fail: a live test reversed MN 95's distinction between preserving and discovering truth. The prompt now states that distinction explicitly; this is mitigation, not proof of correctness.

Further work: expert doctrinal evaluation, broader bilingual evaluation, better semantic retrieval, reviewed study sequences, rights-reviewed corpus expansion, and browser/audio usability testing. The knowledge-map script is experimental and does not establish comprehensive understanding. No original scholarly translation pipeline, reinforcement learning or fine-tuning is implemented.

This release includes actual app assets, context files, prompts and a CC0 text bundle. Expanded originals are acquired using documented scripts. Personal databases, local inference runtime/model weights and SSH credentials must never be published.
