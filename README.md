# Pi config

Personal [Pi coding agent](https://github.com/badlogic/pi-mono) configuration.

The repository is checked out directly at `~/.pi/agent`. Its allowlist-style `.gitignore` keeps credentials, sessions, package clones, dependencies, logs, and machine state out of Git.

## Install on another machine

Pi creates `~/.pi/agent`, so preserve local credentials before replacing it:

```bash
mv ~/.pi/agent ~/.pi/agent.old
git clone https://github.com/vekexasia/pi-config.git ~/.pi/agent
cp ~/.pi/agent.old/auth.json ~/.pi/agent/ 2>/dev/null || true
cp ~/.pi/agent.old/ha.json ~/.pi/agent/ 2>/dev/null || true
pi update --extensions
```

Review and remove `~/.pi/agent.old` after confirming the new setup works.

## Sync

```bash
git -C ~/.pi/agent pull --ff-only
git -C ~/.pi/agent add -A
git -C ~/.pi/agent commit -m "Update Pi config"
git -C ~/.pi/agent push
```

## Tracked

- Pi settings, models, modes, and keybindings
- Local extensions, prompts, agents, and repository-owned skills
- npm package manifests and lockfile

Third-party Git packages are restored from `settings.json`; their clones under `git/` are not committed. Skills installed globally under `~/.agents/skills` remain managed there rather than being vendored into this repository.

## Never committed

`auth.json`, `ha.json`, Home Assistant configuration, trust decisions, sessions, logs, locks, backups, package clones, and `node_modules`.