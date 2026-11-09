"""Synchronize domain data only; never execute upstream content."""
from pathlib import Path
import argparse
import re
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-scholar-!cn.list'


def convert(text):
    rules = []
    seen = set()
    for line in text.splitlines():
        domain = line.split('#', 1)[0].strip()
        if not domain:
            continue
        suffix = domain.startswith('+.')
        if suffix:
            domain = domain[2:]
        if len(domain) > 253 or not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?', domain):
            raise ValueError('Unsupported upstream domain: ' + domain)
        if any(not label or len(label) > 63 or label.startswith('-') or label.endswith('-')
               for label in domain.split('.')):
            raise ValueError('Invalid upstream domain: ' + domain)
        rule = ('DOMAIN-SUFFIX,' if suffix else 'DOMAIN,') + domain
        if rule not in seen:
            seen.add(rule)
            rules.append(rule)
    if len(rules) < 100 or 'DOMAIN-SUFFIX,openreview.net' not in rules:
        raise ValueError('Incomplete upstream data; keep previous rules')
    return sorted(rules)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, help='Use a local upstream snapshot for offline checks')
    args = parser.parse_args()
    if args.input:
        text = args.input.read_text()
    else:
        with urlopen(SOURCE, timeout=30) as response:
            body = response.read(1024 * 1024 + 1)
        if len(body) > 1024 * 1024:
            raise ValueError('Upstream data too large')
        text = body.decode('utf-8')
    rules = convert(text)
    header = '# Community academic domains; policy is defined in ZJU.ini.\n# Source: ' + SOURCE + '\n'
    (ROOT / 'Clash/CommunityAcademic.list').write_text(header + '\n'.join(rules) + '\n')
    (ROOT / 'Clash/Providers/CommunityAcademic.yaml').write_text(
        'payload:\n' + ''.join('  ' + line + '\n' for line in header.splitlines())
        + ''.join('  - ' + rule + '\n' for rule in rules))
    print(f'Synchronized {len(rules)} academic domain rules')


if __name__ == '__main__':
    main()
