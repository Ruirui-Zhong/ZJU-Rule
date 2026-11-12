"""验证域名规则的首次匹配和策略依赖，不发起网络请求。"""
from pathlib import Path
import unittest
import json

ROOT = Path(__file__).resolve().parents[1]
SEARCH = '🔎 学术搜索'
ACADEMIC = '📚 学术资源'


def matches(rule, host):
    parts = rule.split(',')
    if len(parts) < 2:
        return False
    kind, value = parts[:2]
    return ((kind == 'DOMAIN' and host == value)
            or (kind == 'DOMAIN-SUFFIX' and (host == value or host.endswith('.' + value)))
            or (kind == 'DOMAIN-KEYWORD' and value in host))


class ScholarRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sources, cls.groups, cls.aliases = [], {}, {}
        for line in (ROOT / 'Clash/config/ZJU.ini').read_text().splitlines():
            if line.startswith('ruleset=') and '/main/' in line:
                policy, source = line[8:].split(',', 1)
                path = ROOT / source.split('/main/', 1)[1]
                cls.sources.append((policy, path, path.read_text().splitlines()))
            elif line.startswith('compact_group='):
                name, target = line.split('=', 1)[1].split('`')
                cls.aliases[name] = target
            elif line.startswith('custom_proxy_group='):
                name, kind, *members = line.split('=', 1)[1].split('`')
                if name in cls.groups:
                    raise AssertionError('策略组重名：' + name)
                cls.groups[name] = members

    def first_policy(self, host):
        for policy, path, rules in self.sources:
            for rule in rules:
                if matches(rule, host):
                    return self.aliases.get(policy, policy)
        return None

    def test_submission_platforms_and_boundaries(self):
        for host in ['manuscriptcentral.com', 'mc.manuscriptcentral.com',
                     'preprints.org', 'www.preprints.org']:
            self.assertEqual(self.first_policy(host), '🚀 默认代理')
        for host in ['editorialmanager.com', 'www.editorialmanager.com']:
            self.assertEqual(self.first_policy(host), 'DIRECT')
        for host in ['manuscriptcentral.com.example.com', 'notmanuscriptcentral.com',
                     'preprints.org.example.com', 'notpreprints.org']:
            self.assertNotEqual(self.first_policy(host), '🚀 默认代理')
        self.assertNotIn('📄 OpenReview', self.groups)
        self.assertNotIn('📑 学术下载自动回退', self.groups)

    def test_community_source_validation(self):
        from scripts.sync_community_academic import convert
        for text in ['', '<html>error</html>', '+.openreview.net']:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    convert(text)
        sample = '+.openreview.net\nexact.example.org\n' + '\n'.join(
            '+.host%d.example.org' % i for i in range(100))
        rules = convert(sample)
        self.assertIn('DOMAIN,exact.example.org', rules)
        self.assertNotIn('DOMAIN-SUFFIX,exact.example.org', rules)
        self.assertIn('DOMAIN-SUFFIX,openreview.net', rules)

    def test_claude_independent_from_other_ai(self):
        for host in ['claude.ai', 'api.claude.ai', 'www.claude.com', 'api.anthropic.com']:
            self.assertEqual(self.first_policy(host), 'Claude')
        for host in ['chatgpt.com', 'api.openai.com', 'gemini.google.com']:
            self.assertEqual(self.first_policy(host), '🤖 AI 平台')
        for host in ['claude.ai.example.com', 'notclaude.ai']:
            self.assertNotEqual(self.first_policy(host), 'Claude')
        ai = (ROOT / 'Clash/AIPlatforms.list').read_text().splitlines()
        self.assertFalse(any(matches(rule, host) for rule in ai
                             for host in ['claude.ai', 'api.anthropic.com']))

    def test_restored_ai_service_coverage(self):
        for host in ['copilot.microsoft.com', 'copilot.cloud.microsoft', 'cursor.com',
                     'cursor.sh', 'api.groq.com', 'perplexity.ai', 'sora.com',
                     'notebooklm.google.com', 'aistudio.google.com', 'x.ai', 'mistral.ai']:
            with self.subTest(host=host):
                self.assertEqual(self.first_policy(host), '🤖 AI 平台')
        self.assertNotEqual(self.first_policy('cursor.com.example.org'), '🤖 AI 平台')
        self.assertNotEqual(self.first_policy('auth0.com'), '🤖 AI 平台')

    def test_institution_and_general_academic_separation(self):
        for host in ['acm.org', 'jstor.org', 'webofscience.com']:
            self.assertEqual(self.first_policy(host), '📚 机构认证')
        for host in ['ieee.org', 'nature.com', 'sciencedirect.com']:
            self.assertEqual(self.first_policy(host), ACADEMIC)
        self.assertEqual(self.groups['📚 机构认证'][0], '[]✔ ZJU内网')
        self.assertEqual(self.groups['🔐 公共验证'][0], '[]🤖 AI 平台')

    def test_google_scholar_and_dependencies(self):
        rules = (ROOT / 'Clash/ScholarProxy.list').read_text().splitlines()
        for rule in rules:
            if rule.startswith(('DOMAIN,', 'DOMAIN-SUFFIX,')):
                host = rule.split(',')[1]
                with self.subTest(host=host):
                    self.assertEqual(self.first_policy(host), SEARCH)
                    if rule.startswith('DOMAIN-SUFFIX,'):
                        self.assertEqual(self.first_policy('sub.' + host), SEARCH)

    def test_supplement_and_existing_academic_resources(self):
        hosts = ['pubmed.ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov',
                 'api.semanticscholar.org', 'doi.org', 'id.elsevier.com',
                 'sciencedirectassets.com', 'els-cdn.com', 'academic.oup.com',
                 'watermark02.silverchair.com', 'static-content.springer-cdn.com',
                 'opg.optica.org', 'degruyterbrill.com', 'liebertpub.com',
                 'media.springernature.com']
        hosts += [x.split(',')[1] for x in (ROOT / 'Clash/AcademicSupplement.list').read_text().splitlines()
                  if x.startswith('DOMAIN-SUFFIX,')]
        for host in hosts:
            with self.subTest(host=host):
                institution = (ROOT / 'Clash/AcademicPublishers.list').read_text().splitlines()
                expected = '📚 机构认证' if any(matches(rule, host) for rule in institution) else ACADEMIC
                self.assertEqual(self.first_policy(host), expected)

    def test_proxy_search_follows_default_proxy(self):
        self.assertEqual(self.groups[SEARCH][0], '[]🚀 默认代理')
        self.assertIn('[]🏠 家宽节点', self.groups[SEARCH])
        for name in ['🏠 家宽节点']:
            self.assertEqual(self.groups[name][0], '[]🏠 家宽 IPv6')
            self.assertEqual(self.groups[name][1], '[]🏠 家宽 IPv4')
            self.assertTrue(all(not x.startswith('[]') for x in self.groups[name][2:]))
        self.assertEqual(self.groups[ACADEMIC][0], '[]🚀 默认代理')

    def test_shared_challenge_and_researchgate_preserved(self):
        self.assertEqual(self.first_policy('challenges.cloudflare.com'), '🔐 公共验证')
        self.assertEqual(self.first_policy('www.researchgate.net'), 'DIRECT')
        self.assertEqual(self.first_policy('www.zju.edu.cn'), '✔ ZJU内网')

    def test_no_google_or_public_cdn_wide_takeover(self):
        hosts = ['mail.google.com', 'drive.google.com', 'maps.google.com',
                 'gemini.google.com', 'example.googleusercontent.com',
                 'example.gstatic.com', 'example.com', 'scholar.google.com.example.com',
                 'arxiv.org.example.com', 'optica.org.example.com']
        for host in hosts:
            with self.subTest(host=host):
                self.assertNotEqual(self.first_policy(host), SEARCH)

    def test_compact_groups_and_application_routes(self):
        expected = json.loads((ROOT / 'tests/fixtures/group_order.json').read_text())
        self.assertEqual(list(self.groups), expected)
        self.assertEqual(list(self.groups).index('📄 arXiv'), list(self.groups).index('📚 学术资源') + 1)
        self.assertEqual(self.groups['🚀 默认代理'][0], '[]🔯 故障转移')
        self.assertEqual(self.groups['🤖 AI 平台'][0], '[]🏠 家宽节点')
        self.assertIn('[]♻️ 美国自动', self.groups['🤖 AI 平台'])
        self.assertNotIn('⚡ 高速节点', self.groups)
        self.assertIn('[]🇭🇰 香港节点', self.groups['🚀 默认代理'])
        self.assertTrue(all(not x.startswith('[]') for x in self.groups['🚀 手动选择']))
        self.assertEqual(self.groups['📄 arXiv'][0], '[]🇭🇰 香港节点')
        self.assertEqual(self.groups['✔ ZJU内网'][0], '[]DIRECT')
        self.assertIn('[]🚀 默认代理', self.groups['✔ ZJU内网'])
        self.assertEqual(self.groups['🌐 通用服务'][0], '[]DIRECT')
        self.assertIn('[]🚀 默认代理', self.groups['🌐 通用服务'])
        for policy, path, rules in self.sources:
            self.assertIn(policy, {'DIRECT', 'REJECT', *self.groups})
        for host in ['www.youtube.com', 'www.netflix.com']:
            with self.subTest(host=host):
                self.assertEqual(self.first_policy(host), '🌍 国外媒体')
        self.assertEqual(self.first_policy('api.telegram.org'), '🚀 默认代理')
        self.assertEqual(self.first_policy('www.bilibili.com'), '🌏 国内媒体')
        for host in ['www.microsoft.com', 'www.apple.com']:
            with self.subTest(host=host):
                self.assertEqual(self.first_policy(host), '🌐 通用服务')
        for policy, path, _ in self.sources:
            if path.name in ['BanAD.list', 'BanProgramAD.list', 'BanEasyList.list',
                             'BanEasyListChina.list', 'BanEasyPrivacy.list']:
                expected = '🛡️ 隐私防护' if path.name == 'BanEasyPrivacy.list' else '🛑 广告拦截'
                self.assertEqual(policy, expected)

    def test_source_order_and_reviewed_default_directions(self):
        baseline = json.loads((ROOT / 'tests/fixtures/routing_defaults.json').read_text())
        def resolve(policy):
            if policy in ['DIRECT', 'REJECT']:
                return policy
            first = self.groups[policy][0]
            return resolve(first[2:]) if first.startswith('[]') else 'PROXY'
        actual = []
        for line in (ROOT / 'Clash/config/ZJU.ini').read_text().splitlines():
            if line.startswith('ruleset='):
                policy, source = line[8:].split(',', 1)
                actual.append({'source': source, 'default': resolve(policy)})
        self.assertEqual(actual, baseline)
        self.assertEqual(self.groups['🐟 漏网之鱼'][0], '[]🚀 默认代理')
        self.assertEqual(self.groups['🌍 国外媒体'][0], '[]🚀 默认代理')
        self.assertEqual(self.groups['🌏 国内媒体'][0], '[]DIRECT')
        self.assertEqual(self.groups['🛑 广告拦截'][0], '[]REJECT')
        self.assertEqual(self.groups['🛡️ 隐私防护'][0], '[]REJECT')
        self.assertEqual(self.first_policy('rvpn.zju.edu.cn'), 'DIRECT')
        self.assertEqual(self.first_policy('mail.google.com'), '🚀 默认代理')
        self.assertEqual(self.first_policy('login.microsoftonline.com'), '🌐 通用服务')

    def test_arxiv_priority_and_domain_boundaries(self):
        for host in ['arxiv.org', 'export.arxiv.org', 'www.arxiv.org', 'browse.arxiv.org']:
            self.assertEqual(self.first_policy(host), '📄 arXiv')
        for host in ['notarxiv.org', 'arxiv.org.example.com']:
            self.assertNotEqual(self.first_policy(host), '📄 arXiv')
        self.assertEqual(self.groups['📄 arXiv'][0], '[]🇭🇰 香港节点')
        self.assertIn('[]DIRECT', self.groups['📄 arXiv'])
        for policy, path, rules in self.sources:
            if policy == ACADEMIC and path.name != 'CommunityAcademic.list':
                self.assertNotIn('DOMAIN-SUFFIX,arxiv.org', rules)

    def test_new_provider_mirrors_and_sources_exist(self):
        for name in ['ScholarProxy', 'AcademicSupplement', 'AcademicPublishers', 'Arxiv',
                     'CommunityAcademic', 'ResearchDirect', 'ProxyPriority', 'Claude', 'AIPlatforms']:
            expected = [x for x in (ROOT / f'Clash/{name}.list').read_text().splitlines()
                        if x.strip() and not x.startswith('#')]
            actual = [x.strip()[2:] for x in (ROOT / f'Clash/Providers/{name}.yaml').read_text().splitlines()
                      if x.strip().startswith('- ')]
            self.assertEqual(actual, expected)
        self.assertTrue(all(path.exists() for _, path, _ in self.sources))


if __name__ == '__main__':
    unittest.main()
