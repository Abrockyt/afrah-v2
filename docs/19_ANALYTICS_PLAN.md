# 19 / Analytics and user testing
No tracker is installed in this local study.

After a real prototype and appropriate consent configuration, consider Clarity or PostHog. Record chapter_enter, chapter_exit, day_dusk_toggle, skip_intro and replay_form first. Add floor_select, residence_select, map_pin_click and private_viewing_click only when those features exist.
Payload: anonymous session token, chapter ID, elapsed milliseconds, viewport class, quality tier, reduced-motion preference. Exclude names, email, phone, typed messages and full query strings. Mask forms in any replay tool.
Define dwell with visible-tab time; do not count background time as attention.

First formative test: five participants, including one keyboard user and one mobile-only user. Tasks: explain what the building is; switch to dusk; skip the introduction; replay formation. Observe discoverability and confusion before asking aesthetic questions.
Success criteria: controls discovered without prompting by at least four of five; no keyboard trap; user can describe the story; no major frame hitch at the reveal.
No findings or user sessions are fabricated in this package.
