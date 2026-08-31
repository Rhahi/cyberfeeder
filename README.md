# Cyberfeeder

This is a browser extension that adds new scripts and stylesheet into jinteki.net.
It runs on Firefox and on Chromium engines (Chrome, Brave, Edge, Vivaldi).

Cyberfeeder is a free software licensed under GPLv3. Exceptions are listed in LICENSE.DEPENDENCY file.

The extension aims to be:
- Plug and playable.
- Good for reading board states intuitively.
- Easy to integrate into jnet.

# Install

- Firefox: install from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/cyberfeeder/).
- Chromium engines: there is no web store listing, so build it and load it
  unpacked - `npm run build:chromium`, then open the browser's extensions page,
  enable developer mode, choose "Load unpacked" and select the `app` directory.
  Open the panel from the toolbar icon.

# Bulid and test instructions
- Instructions based on Fedora.
- Install build dependencies: `sudo dnf install sass tsc npm nodejs web-ext`.
- `npm install` to setup project
- `npm run build` to run the build script (build.sh)
- `cd` into `app` and Test using `npm run start`
- go to `jinteki.net`, login, navigate to `Play`, and click `Load replay`, select the `replay.json` file in the root of the project and load a replay (attached as replay.json) and click `Start Replay`. Test the application as you see the replay. (you can use arrow keys to navigate game steps.)

# Chromium build (Chrome, Brave, Edge, Vivaldi)

The same source builds a Manifest V3 extension for Chromium engines. The two
manifests live in `manifests/`, and the build copies the one for the target into
`app/manifest.json`, so `npm run build` still produces the Firefox extension.

- `npm run build:chromium` to build - see Install above for loading it - or
  `npm run start:chromium` to launch a temporary profile with it loaded.
- `npm run package:chromium` writes `build/extension-chromium.zip`.

Two differences are forced by the platform:

- Chromium's `action.onClicked` reports no modifier keys, so the toolbar button
  toggles the side panel and the Shift-click (reload script features) and
  Alt-click (inject outside of jinteki.net) actions appear as buttons in the
  panel's settings tab. They stay hidden on Firefox.
- Those buttons get no `activeTab` grant, so the Chromium manifest asks for
  `tabs` in order to read the current tab's URL when requesting permission for
  a host. The Firefox manifest is unchanged.

# Tooling

Build tools are pinned with [hermit](https://cashapp.github.io/hermit/), so node,
prek and jq come from `bin/` and CI runs the same versions you do. Activate it
with `source bin/activate-hermit`. Using hermit is optional for building - any
node 22 works - but the git hooks and CI assume it.

Hooks are managed with [prek](https://github.com/j178/prek), a drop-in
pre-commit replacement that hermit installs:

- `prek install --install-hooks` once, then commits get whitespace/JSON checks,
  a secret scan and a conventional-commit subject check - all fast - and pushes
  get a lint and build of both targets.
- `prek run --all-files` to run everything on demand.

# Releases

Releases are cut by [semantic-release](https://semantic-release.gitbook.io/) from
the commit history, on every push to `main`. It bumps `package.json` and both
manifests, writes `CHANGELOG.md`, tags `v<version>` and attaches
`extension-firefox.zip` and `extension-chromium.zip` to the GitHub release.

It is not a project dependency: `.github/workflows/ci.yml` fetches it and its
plugins with `npx` at exact versions, so `package-lock.json` stays free of ~400
packages that only the release job uses. To try a release without publishing
anything, copy that `npx` line and add `--dry-run`.

Which commit types trigger what:

- `feat:` -> minor, `fix:` and `perf:` -> patch, `feat!:` (or a
  `BREAKING CHANGE:` footer) -> major.
- `chore(deps):` and `dev(deps):` -> patch, so dependency bumps ship.
- `doc:`, `dev:`, `chore:`, `ci:`, `style:`, `test:`, `refactor:` -> no release.

Firefox releases are still submitted manually: download `extension-firefox.zip`
from the GitHub release and upload it to addons.mozilla.org. Chromium releases
are uploaded and submitted to the Chrome Web Store automatically after
semantic-release succeeds. Chrome publishes the submitted version automatically
after its review is approved, using the item's existing visibility settings.

## Chrome Web Store publishing setup

One-time setup for automated Chromium releases:

1. In a Google Cloud project, enable `chromewebstore.googleapis.com` and create
   a dedicated publishing service account. In the Chrome Web Store Developer
   Dashboard's **Account** section, authorize that service-account email.
2. Create a GitHub OIDC Workload Identity Pool provider with issuer
   `https://token.actions.githubusercontent.com`. Map `google.subject` from
   `assertion.sub`, plus `attribute.repository`, `attribute.ref`, and
   `attribute.workflow_ref` from `assertion.repository`, `assertion.ref`, and
   `assertion.workflow_ref`. Restrict the provider condition to
   `attribute.repository == 'Rhahi/cyberfeeder'`,
   `attribute.ref == 'refs/heads/main'`, and
   `attribute.workflow_ref == 'Rhahi/cyberfeeder/.github/workflows/ci.yml@refs/heads/main'`;
   grant only that repository principal `roles/iam.workloadIdentityUser` on the
   publishing service account.
3. Create a GitHub environment named `chrome-web-store`, limited to `main`, with
   these non-secret variables: `GCP_WORKLOAD_IDENTITY_PROVIDER`,
   `GCP_SERVICE_ACCOUNT`, `CHROME_WEB_STORE_PUBLISHER_ID`, and
   `CHROME_WEB_STORE_EXTENSION_ID`. GitHub OIDC issues the short-lived access
   token, so do not create or store a service-account JSON key or token.
4. Before enabling CI, manually publish the extension once and complete its
   listing, privacy, distribution, and visibility settings. API releases retain
   the dashboard's visibility settings.

For a transient store-job failure, use GitHub's **Re-run failed jobs**. The
store job downloads the package from the versioned GitHub release, so it can run
again after the release job has completed. If Chrome rejects a submission,
resolve the validation error in the Developer Dashboard before retrying.

# Used versions (for Mozilla reviewer)
- Fedora Spin Sway (version 42)
- npm 10.9.3
- node v22.19.0,
- tsc Version 5.2.2
- sass 1.69.0 compiled with dart2js 3.1.3
- web-ext 7.7.0
