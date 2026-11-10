# Baize · 白泽智药

An AIDD (AI for drug discovery) news site: it watches journals, preprints, regulator announcements, trade press and company blogs, groups reports of the same event, and publishes a daily edition at 08:00 Beijing time.

The site is in Chinese; the engine is [AIHOT](https://github.com/KKKKhazix/AIHOT) (MIT).

See [README.md](README.md) for the operating manual (in Chinese). Short version:

- `industry/` — taxonomy, topics, sources, selection thresholds, prompts.
- `site/` — name, copy, brand assets, legal pages, files published at the site root.
- `docs/` — engine docs: sources, selection and calibration, grouping, deployment, architecture.

Run it:

```bash
cp .env.example .env      # point LLM_BASE_URL/LLM_API_KEY/LLM_MODEL at an OpenAI-compatible endpoint
docker compose up -d --build
```

The name "AIHOT" and its logo are not covered by the MIT license; this site uses its own name, mark and accent colour. See [NOTICE](NOTICE).
