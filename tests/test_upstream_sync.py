"""Offline validation of the updater's source boundaries and failure behavior."""
from pathlib import Path
import tempfile
import unittest
from scripts.sync_upstream_rules import ai_rules, collect, rule_lines, provider_text


class UpstreamSync(unittest.TestCase):
    def test_rejects_empty_html_and_non_rules(self):
        for text in ['', '<html>gateway error</html>', '{"error":"not found"}', 'invalid.example.com']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                rule_lines(text)

    def test_ai_sources_keep_specific_services_without_global_shared_domains(self):
        base = '\n'.join(['DOMAIN-SUFFIX,cursor.com', 'DOMAIN-SUFFIX,perplexity.ai',
            'DOMAIN-SUFFIX,sora.com', 'DOMAIN-SUFFIX,auth0.com', 'DOMAIN-SUFFIX,claude.ai'])
        result = ai_rules(base, 'DOMAIN-SUFFIX,aistudio.google.com')
        self.assertIn('DOMAIN-SUFFIX,cursor.com', result)
        self.assertIn('DOMAIN-SUFFIX,aistudio.google.com', result)
        self.assertNotIn('DOMAIN-SUFFIX,auth0.com', result)
        self.assertNotIn('DOMAIN-SUFFIX,claude.ai', result)
        self.assertEqual(rule_lines(result).count('DOMAIN-SUFFIX,cursor.com'), 1)

    def test_full_batch_validated_before_replacing_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'Clash').mkdir()
            (root / 'Clash/AIPlatformExtras.list').write_text('DOMAIN-SUFFIX,custom.example')
            file = root / 'Clash/Keep.list'
            file.write_text('DOMAIN-SUFFIX,previous.example\n')
            manifest = {'files': ['Clash/Keep.list', 'Clash/Ruleset/AI.list']}
            def read(name):
                return 'DOMAIN-SUFFIX,new.example' if name.endswith('Keep.list') else '<html>failed</html>'
            with self.assertRaises(ValueError):
                collect(manifest, read, root)
            self.assertEqual(file.read_text(), 'DOMAIN-SUFFIX,previous.example\n')
            with self.assertRaises(ValueError):
                collect({'files': ['../outside.list']}, read, root)

    def test_provider_conversion_is_rule_data_only(self):
        result = provider_text('# note\nDOMAIN-SUFFIX,example.org\nPROCESS-NAME,browser\n')
        self.assertEqual(result, 'payload:\n  - DOMAIN-SUFFIX,example.org\n')


if __name__ == '__main__':
    unittest.main()
