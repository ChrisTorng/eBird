import os
import unittest
from unittest.mock import patch, Mock

import requests
from index import app, checklist_html


class RecentHotspotsTests(unittest.TestCase):
    url = '/proxy?url=https://ebird.org/region/TW/recent-checklists'

    def setUp(self):
        self.client = app.test_client()

    def test_api_feed_escapes_content_and_combines_date_time(self):
        html = checklist_html([{
            'locId': 'L123', 'subId': 'S123', 'numSpecies': 12,
            'obsDt': '2026-09-20', 'obsTime': '08:30',
            'userDisplayName': '<script>bad</script>',
            'loc': {'name': 'A & B', 'isHotspot': True},
        }])
        self.assertIn('2026-09-20T08:30', html)
        self.assertIn('https://ebird.org/hotspot/L123', html)
        self.assertIn('A &amp; B', html)
        self.assertNotIn('<script>', html)

    @patch.dict(os.environ, {'VERCEL': '1', 'EBIRD_API_KEY': ''})
    def test_vercel_requires_key(self):
        self.assertEqual(self.client.get(self.url).status_code, 503)

    @patch.dict(os.environ, {'VERCEL': '1', 'EBIRD_API_KEY': 'test-key'})
    @patch('index.requests.get')
    def test_api_empty_feed_is_success(self, get):
        get.return_value = Mock(json=lambda: [])
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'RecentChecklists', response.data)
        self.assertEqual(get.call_args.kwargs['params'], {'maxResults': 200})
        self.assertEqual(get.call_args.kwargs['headers']['X-eBirdApiToken'], 'test-key')
        self.assertNotIn(b'test-key', response.data)

    @patch.dict(os.environ, {'EBIRD_API_KEY': 'test-key'})
    @patch('index.requests.get', side_effect=requests.Timeout)
    def test_api_failure_is_not_empty_success(self, get):
        self.assertEqual(self.client.get(self.url).status_code, 502)

    def test_invalid_urls(self):
        for url in ['https://example.com/', 'https://ebird.org@evil.test/',
                    'https://ebird.org/region/TW/recent-checklists?redirect=x']:
            self.assertEqual(self.client.get('/proxy', query_string={'url': url}).status_code, 400)


if __name__ == '__main__':
    unittest.main()
