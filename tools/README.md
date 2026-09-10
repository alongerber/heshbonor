# tools

Checks that are not part of the game and are never served with it.

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

## voicetest.js — the standing guard

Plays a full campaign, captures every line the narrator is asked to say,
and fails below 92% coverage.

    python3 -m http.server 8899 &        # from the repo root
    node tools/voicetest.js

    CHROMIUM_PATH=... GAME_URL=... node tools/voicetest.js   # to override
