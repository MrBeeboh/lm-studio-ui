# Git Workflow (Source of Truth + Local Real-Time Testing)

This project uses **GitHub (`origin`) as the source of truth** and your local folder (`C:\CURSOR\lm-studio-ui`) as the live test environment.

You always test locally (for example with `npm run dev`), but you do code changes on short-lived branches and only merge to `master` when verified.

## One-time setup (already applied in this repo)

These repo-local settings are enabled:

- `pull.ff=only`
- `fetch.prune=true`
- `push.autosetupremote=true`
- `rebase.autostash=true`

## Daily workflow

### 1) Sync local `master`

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-master.ps1
```

### 2) Start a branch for one task

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-work.ps1 -BranchName fix/short-description
```

Examples:

- `fix/chat-scroll-bug`
- `feat/model-filter`

### 3) Work and test locally in real time

```powershell
npm run dev
```

### 4) Save progress (commit + push)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-work.ps1 -Message "Fix chat scroll bug"
```

Run this as often as needed during development.

### 5) Finish branch after testing passes

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\finish-work.ps1
```

This will:

1. Sync `master`
2. Fast-forward merge your branch into `master`
3. Push `master` to GitHub
4. Delete your local feature branch

## Recovery rule (important)

If anything feels wrong:

1. Stop coding
2. Run:

```powershell
git status -sb
git branch -vv
git log --oneline --graph --decorate -20
```

3. Do not force push unless you explicitly decide to rewrite remote history.

## Golden rules

- `origin/master` is the official truth.
- Never do new work directly on `master`.
- One branch per task.
- Commit and push frequently.
- Merge to `master` only after local testing passes.
