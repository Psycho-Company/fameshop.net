FINAL LAYOUT FIX

Search/package page was showing package cards under the right sidebar because the previous grid/auto-placement was too fragile.

This build hard-fixes the package section:
- stage-inner widened to 1180px
- package-shell is an explicit 2-column grid
- package-main is flex column: tabs -> post input -> packages -> buy
- package-side is flex column: preview -> trust
- follower preview is hidden until a package is selected
- JS sanity check keeps packages and buy button inside the left column

Use this zip, then hard refresh with Ctrl+F5.
