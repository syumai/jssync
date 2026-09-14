# jssync sandbox runtime

This directory deploys the private JavaScript runtime Worker
`jssync-sandbox-javascript`, built with
[`@sandbox-workers/javascript`](https://github.com/syumai/sandbox-workers).
It runs user-submitted JavaScript in a fuel-metered SpiderMonkey Wasm
instance, in stateless (`--stateless`-equivalent, no persistent code
context, no `/workspace`) execution mode only.

This Worker has no public route. The main jssync Worker calls it through a
Service Binding (`JAVASCRIPT`), configured in the root `wrangler.toml`.

## Deploy

```bash
cd sandbox
pnpm install
pnpm run deploy
```

This Worker must be deployed **before** the main jssync Worker, since the
main Worker's `wrangler.toml` binds it as the `JAVASCRIPT` Service Binding
and deployment will fail if `jssync-sandbox-javascript` does not exist yet.

## License

Before redistributing this Worker or its bundled output, review
`node_modules/@sandbox-workers/javascript/LICENSE` and
`node_modules/@sandbox-workers/javascript/THIRD_PARTY_NOTICES.md` for the
license terms of the bundled SpiderMonkey Wasm engine and its dependencies.
