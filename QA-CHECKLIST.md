# Listy — Real-Device QA Checklist

None of this has been run on a real device by me — I don't have access to
one. Everything below is **manual verification you need to perform**
before calling the MVP ready for a public family test. Check items off as
you go; don't assume a desktop-browser or emulator pass covers these.

**Do not consider Safari audio, mute persistence, or Safari-specific
behavior "verified" until tested on an actual iPhone running Safari** —
Chrome DevTools' device emulation does not reproduce Safari's autoplay/audio
restrictions, iOS Safari's viewport/keyboard quirks, or its RTL rendering.

## Devices to test on
- [ ] An actual iPhone, Safari (not Chrome-on-iOS, which is just Safari's
      engine with a different shell — but native Safari is the one to test).
- [ ] An actual Android phone, Chrome.
- [ ] If available: a second family member's phone, for the two-device
      tests below.

## Portrait widths (320px–430px)
Use each device's real width, not a resized desktop window:
- [ ] iPhone SE / small Android (~320–360px) — no horizontal scroll
      anywhere, no clipped text, sticky bottom bar doesn't cover the last
      task-board row.
- [ ] Standard iPhone (~375–390px).
- [ ] Larger iPhone / Android (~412–430px).
- [ ] Every screen: profile selection, profile home, task board, all
      create/edit forms.

## Landscape fallback
- [ ] Rotate to landscape on the task board mid-session — layout should
      not visually break (more grid columns is fine; portrait remains the
      designed target, but landscape must still be usable).
- [ ] Rotate back to portrait — state (scroll position, in-progress form
      input) should not be lost.

## Sticky bottom actions
- [ ] "סיימתי את המשימות" / "יציאה בלי לסיים" stay visible and reachable
      while scrolling a long task board.
- [ ] Buttons are not obscured by the iPhone home-indicator bar or
      Android's gesture nav bar (safe-area insets).
- [ ] Tapping either button doesn't accidentally trigger the other
      (check spacing/hit-target size with an actual thumb, not a mouse).

## Mobile keyboard
- [ ] Opening any text field (task title, list name, email, password)
      scrolls the field above the keyboard rather than hiding it.
- [ ] The sticky bottom bar doesn't stay pinned on top of the keyboard,
      covering the field being edited.
- [ ] Hebrew keyboard input works correctly (RTL text entry, autocorrect
      doesn't mangle Hebrew).

## RTL navigation
- [ ] Back chevrons visually point right (not left) throughout.
- [ ] Swipe-back gesture (iOS) and Android back button both navigate to
      the expected previous screen, matching the in-app back button.
- [ ] Bottom sheets/dialogs open/close in the expected direction, text is
      right-aligned, form field tab order feels natural in RTL.

## Session persistence
- [ ] Sign in, fully close the browser app (not just background it),
      reopen — still signed in, lands back on profile selection.
- [ ] Force-quit the browser mid-session, reopen — same check.
- [ ] Restart the phone, reopen the browser — still signed in.

## Same account on two devices
- [ ] Sign in with the same family account on two phones.
- [ ] Create a task list on device A — appears live on device B without
      refreshing (or after a manual refresh, at minimum).
- [ ] Complete a task on device A — heart appears on device B live.
- [ ] Complete the *last* task simultaneously-ish on both devices — the
      celebration should fire on whichever device's request actually
      completed the list first, and NOT double-fire on both.

## Safari audio unlock — REQUIRES REAL iPHONE
- [ ] First tap of any task on a fresh page load actually produces sound
      (Safari blocks audio not tied to a user gesture — this is the
      exact scenario the unlock code targets).
- [ ] Completing the final task plays the full celebration audio, not
      silence, on first try (no need to tap twice).
- [ ] Confirm this specifically in Safari, not just Chrome-on-Android.

## Mute persistence
- [ ] Toggle mute, reload the page — stays muted.
- [ ] Toggle mute, close and reopen the browser — stays muted.
- [ ] Mute on one device doesn't affect the other device's session
      (it's a local preference, not synced — confirm that's actually true).

## Heart animation and celebration performance
- [ ] On an older/lower-end phone if you have one: completing a task
      doesn't stutter noticeably; the heart-explosion animation (~20
      particles) runs smoothly, doesn't cause the page to freeze or the
      browser to warn about an unresponsive page.
- [ ] Enable "Reduce Motion" in the phone's OS accessibility settings —
      confirm the celebration switches to the static/fade version, not
      the full particle explosion, and the heart/progress feedback is
      still clearly visible.

## Refresh/reopen with a completed list
- [ ] Complete every task in a list, see the celebration play once.
- [ ] Refresh the page — list still shows fully completed, celebration
      does NOT replay.
- [ ] Navigate away and back — celebration does NOT replay.
- [ ] Only after the list's reset cycle actually elapses should the
      celebration become eligible again.

## Slow or interrupted network
- [ ] Use the phone's own "slow network" simulation if available, or
      test on an actual weak signal (e.g. one bar of LTE): tapping a task
      should show the pending/disabled state during the request rather
      than appearing to hang with no feedback.
- [ ] Turn on Airplane Mode mid-session — the offline banner appears,
      mutation buttons become disabled, no optimistic heart/sound occurs
      on a tap while offline.
- [ ] Turn Airplane Mode back off — banner disappears, actions become
      available again, no stale/incorrect state is left over from the
      offline period.
- [ ] Kill the network mid-request (toggle Airplane Mode right after
      tapping a task) — confirm the app recovers to a consistent state
      (either the write succeeded server-side and the UI catches up via
      the live listener, or it failed and the UI shows an error without a
      stuck spinner).
