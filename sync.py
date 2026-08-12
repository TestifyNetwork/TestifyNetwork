#!/usr/bin/env python3
"""
sync.py — manages two-workspace git sync with Figma Make.

Usage:
  python sync.py --push               Push local commits to remote main.
  python sync.py --pull_and_combine   Pull figma changes and restore local changes on top.
  python sync.py --commit_and_print   Review diff, confirm, and commit.
"""

import argparse
import json
import subprocess
import sys
import os

REMOTE = "origin"
BRANCH = "main"
FIGMA_COMMIT_MSG = "Update files from Figma Make"
SYNC_COMMIT_MSG_PREFIX = "Bringing back changes from"
FIGMA_LIST_FILE = "figma_managed_list.txt"
MIGRATIONS_DIR = os.path.join("supabase", "migrations")


# ── Shell helpers ─────────────────────────────────────────────────────────────

def run(cmd, check=True, capture=True, **kwargs):
    """Run a command. Pass a list to avoid shell interpretation (preferred)."""
    use_shell = isinstance(cmd, str)
    result = subprocess.run(cmd, shell=use_shell, text=True,
                            capture_output=capture, **kwargs)
    if check and result.returncode != 0:
        display = " ".join(cmd) if isinstance(cmd, list) else cmd
        print(f"Command failed: {display}")
        if result.stderr:
            print(result.stderr.strip())
        sys.exit(1)
    return result


def run_interactive(cmd):
    """Run a command with output going directly to the terminal."""
    use_shell = isinstance(cmd, str)
    result = subprocess.run(cmd, shell=use_shell)
    if result.returncode != 0:
        sys.exit(1)


# ── Git state helpers ─────────────────────────────────────────────────────────

def is_clean():
    return run(["git", "status", "--porcelain"]).stdout.strip() == ""


def fetch_remote():
    run(["git", "fetch", REMOTE], capture=False)


def commits_behind():
    result = run(["git", "rev-list", f"HEAD..{REMOTE}/{BRANCH}", "--count"])
    return int(result.stdout.strip())


def commits_ahead():
    result = run(["git", "rev-list", f"{REMOTE}/{BRANCH}..HEAD", "--count"])
    return int(result.stdout.strip())


def changed_files():
    result = run(["git", "status", "--porcelain"])
    files = []
    for line in result.stdout.strip().splitlines():
        if line.strip():
            files.append(line[3:].strip())
    return files


# ── Figma list helpers ────────────────────────────────────────────────────────

def load_figma_list():
    if not os.path.exists(FIGMA_LIST_FILE):
        print(f"Warning: {FIGMA_LIST_FILE} not found. Treating figma list as empty.")
        return []
    with open(FIGMA_LIST_FILE) as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


def is_figma_managed(filepath, figma_list):
    for entry in figma_list:
        entry = entry.rstrip("/")
        if filepath == entry or filepath.startswith(entry + "/"):
            return True
    return False


# ── Git log helpers ───────────────────────────────────────────────────────────

def iter_commits():
    """Yield (hash, subject) for all commits on current branch, newest first."""
    # Use \x1f (ASCII unit separator) as delimiter — safe from shell and unlikely in commit messages
    result = run(["git", "log", "--format=%H\x1f%s"])
    for line in result.stdout.strip().splitlines():
        if "\x1f" in line:
            h, s = line.split("\x1f", 1)
            yield h.strip(), s.strip()


def is_figma_or_sync_commit(subject):
    return subject == FIGMA_COMMIT_MSG or subject.startswith(SYNC_COMMIT_MSG_PREFIX)


def find_most_recent_non_figma_commit():
    for h, s in iter_commits():
        if not s == FIGMA_COMMIT_MSG: 
            return h, s
    return None, None


def find_most_recent_figma_commit():
    for h, s in iter_commits():
        if s == FIGMA_COMMIT_MSG:
            return h, s
    return None, None


# ── Supabase migration sync ─────────────────────────────────────────────────────
# Figma Make deploys schema changes straight to the live Supabase project —
# a separate channel from its git commits — so a migration can show up as
# "remote" with no matching local file. `supabase db pull` refuses to run
# while any such mismatch exists, so we repair the CLI's tracking ledger for
# each one first, then pull the real schema into a local migration file.

def get_migration_status():
    """Returns the list of {local, remote, time} dicts from `supabase migration list`.
    Exits the process (via run()) if the CLI call fails."""
    result = run(["supabase", "migration", "list"])
    try:
        return json.loads(result.stdout).get("migrations", [])
    except json.JSONDecodeError:
        print("Error: could not parse `supabase migration list` output:")
        print(result.stdout.strip())
        sys.exit(1)


def sync_remote_only_migrations():
    """Repairs and pulls any migrations Figma Make applied directly to Supabase
    without a matching local file. Returns True if a new migration file landed."""
    migrations = get_migration_status()

    remote_only = [m["remote"] for m in migrations if m.get("remote") and not m.get("local")]
    if not remote_only:
        return False

    print(f"Found {len(remote_only)} migration(s) Figma Make applied directly to "
          f"Supabase (no local file): {', '.join(remote_only)}")

    for version in remote_only:
        print(f"Repairing migration history for {version}...")
        run(["supabase", "migration", "repair", "--status", "reverted", version])

    print("Pulling current schema into a local migration file...")
    before = set(os.listdir(MIGRATIONS_DIR)) if os.path.isdir(MIGRATIONS_DIR) else set()
    run_interactive(["supabase", "db", "pull"])
    after = set(os.listdir(MIGRATIONS_DIR)) if os.path.isdir(MIGRATIONS_DIR) else set()

    new_files = sorted(after - before)
    if new_files:
        print(f"Pulled {len(new_files)} new migration file(s): {', '.join(new_files)}")
    else:
        print("No new migration file was generated.")
    return bool(new_files)


# ── Commands ──────────────────────────────────────────────────────────────────

# Will push if working directory is clean and local branch is up to date with remote branch
def cmd_push():
    if not is_clean():
        print("Error: working directory is not clean.")
        print("Commit your changes first with:  python sync.py --commit_and_print")
        sys.exit(1)

    fetch_remote()
    behind = commits_behind()
    if behind > 0:
        print(f"Error: local branch is {behind} commit(s) behind remote.")
        print("Sync first with:  python sync.py --pull_and_combine")
        sys.exit(1)

    run_interactive(["git", "push", REMOTE, BRANCH])
    print("Pushed to remote main.")

# Pull from remote and create new commit to create up to date combination of figma and claude dev 
def cmd_pull_and_combine():
    if not is_clean():
        print("Error: working directory is not clean.")
        print("Commit your changes first with:  python sync.py --commit_and_print")
        sys.exit(1)
    
    figma_list = load_figma_list()
    restored = []
    skipped = []

    # Pull remote changes
    print(f"Pulling from {REMOTE}/{BRANCH}...")
    run_interactive(["git", "pull", REMOTE, BRANCH])

    # After pulling, find the commits we need
    latest_commit, latest_subject = next(iter_commits(), (None, None))
    if latest_subject != FIGMA_COMMIT_MSG:
        print(f"The most recent commit is not a Figma commit:")
        print(f"  \"{latest_subject}\"")
        return

    our_commit, our_subject = find_most_recent_non_figma_commit()
    if not our_commit:
        print("No non-figma commit found — nothing to restore.")
        return


    print(f"Restoring from commit: {our_commit[:8]}  \"{our_subject}\"")

    # Files that differ between our commit and HEAD (figma's latest)
    diff_result = run(["git", "diff", "--name-only", our_commit, "HEAD"])
    diffed_files = [f.strip() for f in diff_result.stdout.strip().splitlines() if f.strip()]


    for filepath in diffed_files:
        if is_figma_managed(filepath, figma_list):
            skipped.append(filepath)
        else:
            # File may have been deleted in our commit; check if it exists there
            exists = run(["git", "ls-tree", our_commit, "--", filepath], check=False)
            if exists.stdout.strip():
                run(["git", "checkout", our_commit, "--", filepath])
                restored.append(filepath)
            else:
                # File was added by figma and doesn't exist in our commit
                print(f"\nFigma added a file that wasn't in your last commit: {filepath}")
                answer = input("  Remove it? (y/n): ").strip().lower()
                if answer == "y":
                    run(["git", "rm", "-f", filepath])
                    restored.append(filepath)
                else:
                    skipped.append(filepath)

    print(f"Restored {len(restored)} file(s), skipped {len(skipped)} figma-managed file(s).")

    sync_remote_only_migrations()

    if not restored and is_clean():
        print("No files to restore (all diffs are in the figma list).")
        return

    if is_clean():
        print("No changes after restore — nothing to commit.")
        return

    commit_msg = f"Bringing back changes from {our_commit[:8]} that aren't in figma's scope"
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", commit_msg])
    print(f"Created commit: \"{commit_msg}\"")


def cmd_commit_and_print():
    fetch_remote()
    behind = commits_behind()
    if behind > 0:
        print(f"Error: local branch is {behind} commit(s) behind remote.")
        print("Suggestion:")
        print("  git stash")
        print("  python sync.py --pull_and_combine")
        print("  git stash pop")
        sys.exit(1)

    figma_list = load_figma_list()
    if figma_list:
        figma_changed = [f for f in changed_files() if is_figma_managed(f, figma_list)]
        if figma_changed:
            print("Error: the following figma-managed files have local changes:")
            for f in figma_changed:
                print(f"  {f}")
            print("\nDiff of figma-managed files:")
            for f in figma_changed:
                result = run(["git", "diff", "--", f], check=False)
                if result.stdout.strip():
                    print(result.stdout)
            print("\nMake these changes in Figma Make instead, then remove them here before committing.")
            sys.exit(1)

    # Show full diff
    diff = run(["git", "diff", "HEAD"], check=False).stdout
    if diff.strip():
        print(diff)
    else:
        status = run(["git", "status"]).stdout
        print(status)
        print("(No unstaged diff — you may have untracked files or already-staged changes.)")

    approval = input("\nApprove these changes and proceed with commit? (y/n): ").strip().lower()
    if approval != "y":
        print("Commit aborted.")
        sys.exit(0)

    message = input("Commit message: ").strip()
    if not message:
        print("Error: commit message cannot be empty.")
        sys.exit(1)

    run(["git", "add", "-A"])
    run(["git", "commit", "-m", message])
    print(f"Committed: \"{message}\"")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Two-workspace git sync helper.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--push", action="store_true",
                       help="Push local commits to remote main.")
    group.add_argument("--pull_and_combine", action="store_true",
                       help="Pull figma changes and restore local changes on top.")
    group.add_argument("--commit_and_print", action="store_true",
                       help="Review diff, confirm, and commit.")
    args = parser.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    if args.push:
        cmd_push()
    elif args.pull_and_combine:
        cmd_pull_and_combine()
    elif args.commit_and_print:
        cmd_commit_and_print()


if __name__ == "__main__":
    main()
