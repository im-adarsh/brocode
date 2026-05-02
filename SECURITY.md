# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | ✅ |
| 0.2.x   | ❌ — upgrade to 0.3 |
| < 0.2   | ❌ |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues by opening a [GitHub Security Advisory](https://github.com/im-adarsh/brocode/security/advisories/new) with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional)

You will receive a response within 72 hours. If confirmed, a patch will be released as quickly as possible.

## Scope

brocode is a Claude Code plugin — it runs markdown instruction files as agent prompts. Security-relevant areas:

- **Hook scripts** (`hooks/`) — shell scripts that execute on tool calls
- **`~/.brocode/repos.json`** — contains local filesystem paths
- **`~/.brocode/config.json`** — plugin configuration
- **Subcommand injection** — inputs passed to `/brocode` that could influence shell commands in mode files

Out of scope: issues in Claude Code itself, the Anthropic API, or the superpowers plugin.
