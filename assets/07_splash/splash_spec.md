# NexGate splash screen spec (total 1.6 s, then go to the home screen)
Background: Gate Blue #2563EB, full screen. Logo is the white N glyph, centred, about 30% of screen width.
Timeline
- 0.10 s  N glyph fades in and scales 0.82 -> 1.04 -> 1.0 (0.6 s, ease-out)
- 0.70 s  Live dot pops in (scale 0 -> 1.25 -> 1.0, 0.35 s)
- 1.05 s  Dot pings once: a thin mint ring expands to 4x and fades (0.8 s)
- 1.60 s  Hand off to the app (do not hold longer; the app should never wait on the animation)
Rules: play once per cold start, never loop, skip on warm start. Android 12+: use splash_icon_1152.png as the
splash icon on #2563EB, and run this animation on the first Flutter frame if you want the dot ping.
Reduce motion: if the system setting is on, show the static logo for 0.4 s only.
