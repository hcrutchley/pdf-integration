Document 1 – Base44 → Standalone React/Vite App Conversion Plan
1. Project setup and structure
Create a new Vite React shell
npm create vite@latest . -- --template react
Keep existing components/, pages/, entities/, Layout files; don’t overwrite them.
Move code under src
src/components, src/pages, src/entities, src/Layout.jsx, etc.
Fix file extensions
All React components/pages must be .jsx (or .tsx) – no extensionless files.
Services and non‑JSX modules can be .js.
2. Routing, data fetching and aliases
React Router + React Query
Install: npm install react-router-dom @tanstack/react-query.
In App.jsx:
Wrap with <BrowserRouter> and <QueryClientProvider>.
Define routes for all pages and wrap each in your Layout component.
Path alias @
In vite.config.js:
resolve.alias['@'] = path.resolve(__dirname, 'src').
This makes imports like @/components/... and @/utils work.
Routing helper
Add src/utils.jsx (or .js) with a simple createPageUrl(name) map for all route names used in the project.
3. Tailwind + styling (the “look”)
Use Tailwind 3 with standard PostCSS config
npm install -D tailwindcss@3 postcss autoprefixer.
npx tailwindcss init -p or create:
tailwind.config.js:
darkMode: 'class'
content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"]
postcss.config.cjs:
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
Index CSS
src/index.css:
@tailwind base;, @tailwind components;, @tailwind utilities;
Optional minimal global reset (body margin 0, font stack).
Remove Vite demo styles
Strip the default App.css (logos, centered layout, etc.) so they don’t fight Tailwind.
Theme / dark mode
ThemeProvider toggles document.documentElement.classList.toggle('dark', ...).
Tailwind must use darkMode: 'class'.
Components should use ... dark:bg-... etc., which Base44 already does.
4. Recreating shadcn-style UI layer
Base44 projects assume a shadcn/ui-like library under src/components/ui/*. For portability you can:
Implement minimal local versions of the primitives you use:
button.jsx, card.jsx, input.jsx, label.jsx, switch.jsx, badge.jsx,
dropdown-menu.jsx, dialog.jsx, select.jsx, checkbox.jsx, tabs.jsx,
popover.jsx, command.jsx.
Design goal
Use Tailwind utility classes that give:
Rounded corners, subtle shadows, neutral backgrounds.
Teal accent color for primary actions.
Consistent spacing and typography.
(For future projects you might instead install real shadcn/ui and generate the components, but the above works offline without extra tooling.)
5. Third‑party libs you must install
Base44’s frontends commonly rely on:
Icons & UI
lucide-react
sonner (toast notifications)
Drag and drop
@hello-pangea/dnd
PDF tools
pdf-lib (for generation)
pdfjs-dist (for rendering in a <canvas> viewer)
Data utilities
date-fns
React stack
react, react-dom, react-router-dom, @tanstack/react-query (usually already in Vite template).
Install once per project:
npm install lucide-react sonner @hello-pangea/dnd pdf-lib pdfjs-dist date-fns \  react-router-dom @tanstack/react-query
6. Handling Base44 backend dependencies
Isolate and replace these layers; for quick local dev you can stub them first:
Database service (components/services/database)
Original: base44.entities[...] for CRUD on entities like PDFTemplate, Section, etc.
For quick dev: stub with an in‑memory store or simple localStorage client.
For real backend: re‑implement db.create/list/filter/update/delete to call your own API (Cloudflare Worker, Supabase, etc.).
Auth (components/context/OrgContext, pages/Organizations)
Original: base44.auth.me().
Temporary: fake user in a stubbed base44.auth.me() or a simple authService.me().
Real: integrate Firebase Auth, Clerk, or your own token‑based auth.
File storage (components/services/fileStorage)
Original: base44.integrations.Core.UploadFile.
Temporary: return URL.createObjectURL(file) for in‑browser previews only.
Real: upload to Cloudflare R2, S3, or Cloudinary and return a public URL.
AI service (components/services/aiService)
Original: base44.integrations.Core.InvokeLLM and ExtractDataFromUploadedFile.
If AI is optional: stub detectPDFFields to return [] and keep everything manual.
Real: call your own endpoint that wraps OpenAI/Anthropic.
Routing helper (createPageUrl)
Already handled via src/utils.
7. Cloudflare hosting direction (high‑level)
Once the frontend is clean and builds:
Static frontend
Build: npm run build.
Deploy via Cloudflare Pages (link repo or direct upload of dist).
Backend APIs
Create Workers for:
/api/db/* → DB (D1, Supabase, etc.)
/api/upload → R2/S3/Cloudinary
/api/ai/* → AI provider
Update database, fileStorage, aiService to call these Workers.