# VibeLine UI

The Next.js UI is part of VibeLine and shares its version, [changelog](../CHANGELOG.md), and [contribution conventions](../README.md#version-management).

From the repository root:

```bash
npm run ui:install
npm run ui:dev
```

Open <http://localhost:555>. Run `npm run ui:check` to lint and type-check, or `npm run ui:build` followed by `npm run ui:start` for production.

After building, run `python3 -m unittest discover -s tests -p 'test_ui_smoke.py'` from the root to test reads and edits against temporary data.

The UI uses the root `VoiceMemos` directory by default. Set `VOICE_MEMOS_DIR` to an absolute path to use another directory. Set `PORT` to change the HTTP port. UI environment files belong in `ui/.env.local`; the processor reads the root `.env`.

Next.js 15.5.26 pins vulnerable PostCSS 8.4.31. The npm override uses patched 8.5.28; remove it once Next.js includes a patched version. CI rejects high and critical npm audit findings.

Imported from [vibeline-ui at 5c480f7](https://github.com/dergigi/vibeline-ui/tree/5c480f7cc03e42968bf4de66c4b6ad1e97cbf49b). Earlier UI history and tags remain in that repository; future releases are managed here.
