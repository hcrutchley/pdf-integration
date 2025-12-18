Document 2 – Common Pitfalls and Easy Mistakes (Base44 → Vite/Tailwind)
File / module issues
Missing extensions
Vite error: “Failed to parse source for import analysis… invalid JS syntax; if you are using JSX, make sure to name the file with the .jsx or .tsx extension.”
Fix: any file containing JSX must be .jsx; run a script to append .jsx to extensionless files in src/pages and JSX components in src/components.
Imports using @
Error: “Failed to resolve import '@/components/ui/card'.”
Fix: define @ alias in vite.config.js and ensure the file actually exists (src/components/ui/card.jsx).
Tailwind & PostCSS traps
Using Tailwind 4 without proper setup
Errors about unknown utility classes or needing @reference.
Easiest path for now: use Tailwind 3 with classic postcss.config.cjs (tailwindcss + autoprefixer).
Forgetting darkMode: 'class'
Theme toggle appears to work (state changes) but the UI doesn’t change.
Fix: darkMode: 'class' in tailwind.config.js + toggling document.documentElement.classList.
Mixing Vite demo CSS with Tailwind
Symptoms: app centered, weird margins, text alignment off.
Fix: remove or drastically simplify App.css and index.css from the Vite template; rely on Tailwind classes.
Missing UI primitives
Imports like @/components/ui/button, card, dialog, etc. not found
Fix: either install/generate real shadcn components or create local stubs that:
Render appropriate HTML elements.
Use Tailwind classes for consistent design.
Popover/command/accordion/select
These often appear only in a few components (field pickers, dropdowns).
Minimal, non‑animated versions are usually enough to restore functionality.
External dependencies
Drag and drop & PDF viewer
Errors: “Cannot find module '@hello-pangea/dnd'” or “Cannot find module 'pdfjs-dist'”.
Fix: install these packages explicitly; they’re not part of Vite by default.
Utility libs
date-fns, pdf-lib, lucide-react, sonner may be referenced but not installed.
PowerShell / Windows quirks
Using && in a PowerShell script call from tools:
In raw PowerShell, prefer:
On separate lines:
      cd "C:\path\to\proj"      npm install ...
Ports in use:
If 5173 is busy, Vite will auto‑pick 5174 etc.; just open the new URL.
Theming / layout surprises
Theme toggle showing only one theme
Usually Tailwind dark mode misconfig (see above).
Sidebar or layout compressed/centered
Caused by leftover demo CSS on #root or body; remove these so Tailwind layout classes dominate.