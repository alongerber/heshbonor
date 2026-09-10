# tools

Checks that are not part of the game and are never served with it.

## serve.js — a static server that honours Range

Use this rather than `python3 -m http.server` when testing anything that
touches audio or the service worker. Python's server ignores `Range` and
always answers 200; a real CDN answers **206 Partial Content**, and the
206 path is where the service worker's caching went wrong once already —
under Python's server the bug was invisible.

    node tools/serve.js        # serves the repo root on 8899

## vres.js — does Morris have a recording for this line?

Morris is recorded line by line. A sentence plays in his own voice only
when the WHOLE line resolves to clips; anything else falls through to the
device's speech synthesiser, which on a phone with no Hebrew voice
installed is an English one reading Hebrew letters as English.

Before writing a new line for him, check it:

    node tools/vres.js "3 כפול 4 שווה 12" "יש חור במגן"
      OK   "3 כפול 4 שווה 12" -> 5 clips
     MISS  "יש חור במגן" stuck at: "יש חור במגן"

A MISS is not fatal — it means that line will be silent on a phone with no
Hebrew voice. Prefer rephrasing it into words he has. What he SAYS and what
the screen SHOWS do not have to match.

## sweep.js — every line, every a x b, both genders

Enumerates every sentence the game can produce and checks each against the
recordings. Fast, offline, exhaustive. It mirrors the strings by hand, so
change it when you change a line Morris says.

    node tools/sweep.js

## voicetest.js — the standing guard

Plays a full campaign, captures every line the narrator is asked to say,
and fails below 92% coverage. Needs playwright, which the game itself does
not — install it wherever you like and point node at it.

    npm i playwright                     # once, anywhere
    python3 -m http.server 8899 &        # from the repo root
    node tools/voicetest.js

    # if playwright or chromium live elsewhere:
    NODE_PATH=/path/to/node_modules \
    CHROMIUM_PATH=/path/to/chrome \
    GAME_URL=http://127.0.0.1:8899/index.html \
      node tools/voicetest.js

Last run: 1193 utterances over 130 fights, 100% in Morris's own voice.
