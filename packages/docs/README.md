# Documentation website

Docusaurus site for jest-gpu, deployed to <https://jest-gpu.ben3d.ca/>.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:build
pnpm --filter @jest-gpu/docs serve
```

`typedoc.json` drives `pnpm generate`, which regenerates `docs/api/` from both packages' source and TSDoc comments before every development or production build. Edit source comments for API changes; edit `docs/*.md` for guides. Generated API pages and build outputs are ignored.

CI runs `pnpm docs:build` on one Linux job, so pull request CI checks generated pages and broken links. The site currently deploys on every merge to `main`: `.github/workflows/pages.yml` builds `packages/docs`, uploads it with `upload-pages-artifact` and publishes it with `deploy-pages`. GitHub Pages must use **GitHub Actions** as its build source.
