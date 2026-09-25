# 08 / Typography
Local evidence: `../Afrah/src/styles/fonts.css` imports Playfair Display (400/700/900), Inter (300–700), Montserrat (300–700) from Google Fonts. The hero and footer also use Inter. Presence in source is evidence of existing use, not proof of a signed brand approval.

Prototype direction: Playfair Display Regular for short editorial display, Inter for interface and body. Retain Montserrat in the audit but do not add a third competing voice. Until font packaging is settled, Georgia and Arial/system sans are honest native fallbacks. No Canela, Suisse, Decart, TT Norms, Whiteley or Lausanne binaries are to be scraped.

| Role | Desktop | Mobile | Line-height |
|---|---|---|---|
| Display | clamp(3rem, 7.5vw, 8.125rem) | 48–64px typical | 1.02 |
| Section | 56–80px | 36–44px | 1.08 |
| Body | 18px | 16px | 1.55 |
| Caption / control | 12–14px | 12–14px | 1.4 |
| Wordmark | 32px utility / larger opening | 26px utility | 1 |

Use one face and colour per heading; avoid isolated italic or coloured words. Balance short headlines. No text embedded in hero photography, 3D canvas or generated imagery. Future font changes go through tokens so replacing a fallback does not require editing every component.
