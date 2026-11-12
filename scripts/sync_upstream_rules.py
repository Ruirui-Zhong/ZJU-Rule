"""Refresh allowlisted rule data from one upstream commit; keep local policies separate."""
from pathlib import Path
import argparse
import json
import re
import subprocess
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'SubConv/ZJU-Rule'


def rule_lines(text):
    if '<html' in text[:500].lower() or '<!doctype' in text[:500].lower():
        raise ValueError('Upstream returned HTML instead of rules')
    result = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if not re.match(r'^[A-Z][A-Z0-9-]*,\S', line):
            raise ValueError('Invalid rule data: ' + line[:80])
        result.append(line)
    if not result:
        raise ValueError('Empty upstream rules')
    return result


def provider_path(relative):
    return Path('Clash/Providers') / Path(relative).relative_to('Clash').with_suffix('.yaml')


def provider_text(text):
    return 'payload:\n' + ''.join('  - ' + line + '\n' for line in rule_lines(text)
        if not line.startswith(('USER-AGENT,', 'URL-REGEX,', 'PROCESS-NAME,')))


def ai_rules(upstream, extras):
    shared = {'auth0.com', 'challenges.cloudflare.com', 'client-api.arkoselabs.com',
              'events.statsigapi.net', 'featuregates.org', 'identrust.com', 'intercom.io',
              'intercomcdn.com', 'sentry.io', 'stripe.com'}
    claude = {'claude', 'anthropic', 'claude.ai', 'claude.com', 'claudeusercontent.com', 'anthropic.com'}
    rules = []
    for line in rule_lines(upstream) + rule_lines(extras):
        if line.split(',')[1] not in shared | claude and line not in rules:
            rules.append(line)
    required = ['DOMAIN-SUFFIX,cursor.com', 'DOMAIN-SUFFIX,perplexity.ai', 'DOMAIN-SUFFIX,sora.com']
    if any(line not in rules for line in required):
        raise ValueError('Incomplete AI source; retain previous data')
    return '# Generated from upstream AI rules and AIPlatformExtras.list; Claude and shared dependencies are separate.\n' + '\n'.join(rules) + '\n'


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'ZJU-Rule-rule-sync'}), timeout=30) as response:
        data = response.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise ValueError('Upstream response too large')
    return data.decode('utf-8-sig')


def collect(manifest, read, root=ROOT):
    """Validate the entire update before replacing any file."""
    updates = {}
    for relative in manifest['files']:
        path = Path(relative)
        if path.is_absolute() or '..' in path.parts or not relative.startswith('Clash/') or not relative.endswith('.list'):
            raise ValueError('Invalid upstream allowlist path')
        text = read(relative)
        lines = rule_lines(text)
        previous = root / relative
        if previous.exists() and len(lines) < max(1, len(rule_lines(previous.read_text())) // 2):
            raise ValueError('Unexpected rule-count drop in ' + relative)
        for line in manifest.get('additions', {}).get(relative, []):
            rule_lines(line)
            if line not in lines:
                text = text.rstrip() + '\n' + line + '\n'
                lines.append(line)
        updates[relative] = text.rstrip() + '\n'
    updates['Clash/AIPlatforms.list'] = ai_rules(updates['Clash/Ruleset/AI.list'],
        (root / 'Clash/AIPlatformExtras.list').read_text())
    for relative, text in list(updates.items()):
        updates[str(provider_path(relative))] = provider_text(text)
    return updates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, help='Use an offline upstream checkout')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'config/upstream_rules.json').read_text())
    if args.source_dir:
        upstream_sha = subprocess.check_output(['git', '-C', str(args.source_dir), 'rev-parse', 'HEAD'], text=True).strip()
        read = lambda relative: (args.source_dir / relative).read_text()
    else:
        upstream_sha = json.loads(fetch(f'https://api.github.com/repos/{REPOSITORY}/commits/main'))['sha']
        if not re.fullmatch(r'[0-9a-f]{40}', upstream_sha):
            raise ValueError('Invalid upstream commit')
        read = lambda relative: fetch(f'https://raw.githubusercontent.com/{REPOSITORY}/{upstream_sha}/{relative}')
    updates = collect(manifest, read)
    # No timestamps: rerunning against identical upstream data produces no noisy commit.
    updates['config/upstream-lock.json'] = json.dumps({'repository': REPOSITORY, 'commit': upstream_sha,
        'files': manifest['files']}, ensure_ascii=False, indent=2) + '\n'
    for relative, text in updates.items():
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    print(f'Synchronized {len(manifest["files"])} upstream sources at {upstream_sha[:12]}; local policies retained')


if __name__ == '__main__':
    main()
