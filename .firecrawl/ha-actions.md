[Skip to content](https://github.com/home-assistant/actions#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/home-assistant/actions) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/home-assistant/actions) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/home-assistant/actions) to refresh your session.Dismiss alert

{{ message }}

[home-assistant](https://github.com/home-assistant)/ **[actions](https://github.com/home-assistant/actions)** Public

- Sponsor







# Sponsor home-assistant/actions



















##### External links









[https://www.openhomefoundation.org](https://www.openhomefoundation.org/)









[Learn more about funding links in repositories](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).




[Report abuse](https://github.com/contact/report-abuse?report=home-assistant%2Factions+%28Repository+Funding+Links%29)

- [Notifications](https://github.com/login?return_to=%2Fhome-assistant%2Factions) You must be signed in to change notification settings
- [Fork\\
33](https://github.com/login?return_to=%2Fhome-assistant%2Factions)
- [Star\\
43](https://github.com/login?return_to=%2Fhome-assistant%2Factions)


master

[**9** Branches](https://github.com/home-assistant/actions/branches) [**1** Tag](https://github.com/home-assistant/actions/tags)

[Go to Branches page](https://github.com/home-assistant/actions/branches)[Go to Tags page](https://github.com/home-assistant/actions/tags)

Go to file

Code

Open more actions menu

## Folders and files

| Name | Name | Last commit message | Last commit date |
| --- | --- | --- | --- |
| ## Latest commit<br>[![sairon](https://avatars.githubusercontent.com/u/211416?v=4&size=40)](https://github.com/sairon)[sairon](https://github.com/home-assistant/actions/commits?author=sairon)<br>[Fix info helper when](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b)`config.*` [is missing (](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b) [#136](https://github.com/home-assistant/actions/pull/136) [)](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b)<br>Open commit detailssuccess<br>last monthApr 7, 2026<br>[f6f29a7](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b) · last monthApr 7, 2026<br>## History<br>[164 Commits](https://github.com/home-assistant/actions/commits/master/) <br>Open commit details<br>[View commit history for this file.](https://github.com/home-assistant/actions/commits/master/) 164 Commits |
| [.github](https://github.com/home-assistant/actions/tree/master/.github ".github") | [.github](https://github.com/home-assistant/actions/tree/master/.github ".github") | [Update info helper for new app build workflows (](https://github.com/home-assistant/actions/commit/5752577ea7cc5aefb064b0b21432f18fe4d6ba90 "Update info helper for new app build workflows (#135)  * Update info helper for new app build workflows  Extract additional app metadata (name, slug, description, url) from config files and validate required options per the app configuration spec. The action now errors when required fields (name, version, slug, description, arch) are missing. Also marks build.* files as deprecated with a warning to move base image, build arguments and labels to Dockerfile.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Update tests for info helper required config validation  Add required fields (name, slug, description) to test config files and add companion config files alongside deprecated build test files so required field validation passes. Add workflow steps to validate the new outputs.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add warning if image is not set  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") [#135](https://github.com/home-assistant/actions/pull/135) [)](https://github.com/home-assistant/actions/commit/5752577ea7cc5aefb064b0b21432f18fe4d6ba90 "Update info helper for new app build workflows (#135)  * Update info helper for new app build workflows  Extract additional app metadata (name, slug, description, url) from config files and validate required options per the app configuration spec. The action now errors when required fields (name, version, slug, description, arch) are missing. Also marks build.* files as deprecated with a warning to move base image, build arguments and labels to Dockerfile.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Update tests for info helper required config validation  Add required fields (name, slug, description) to test config files and add companion config files alongside deprecated build test files so required field validation passes. Add workflow steps to validate the new outputs.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add warning if image is not set  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") | last monthApr 2, 2026 |
| [hassfest](https://github.com/home-assistant/actions/tree/master/hassfest "hassfest") | [hassfest](https://github.com/home-assistant/actions/tree/master/hassfest "hassfest") | [typo](https://github.com/home-assistant/actions/commit/26d56ed1a1cbfeabf59feb7b26e368e13f47ef52 "typo") | 2 years agoAug 28, 2024 |
| [helpers](https://github.com/home-assistant/actions/tree/master/helpers "helpers") | [helpers](https://github.com/home-assistant/actions/tree/master/helpers "helpers") | [Fix info helper when](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b "Fix info helper when `config.*` is missing (#136)  The info helper checked whether app-specific config options exist even when no config.* was found. If the repo only uses the legacy build.yaml, it should not fail in that case.  Also break out of the config.* search loop in case when a file is found, without that the order of precedence of the suffixes is effectively swapped when compared with build.*.")`config.*` [is missing (](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b "Fix info helper when `config.*` is missing (#136)  The info helper checked whether app-specific config options exist even when no config.* was found. If the repo only uses the legacy build.yaml, it should not fail in that case.  Also break out of the config.* search loop in case when a file is found, without that the order of precedence of the suffixes is effectively swapped when compared with build.*.") [#136](https://github.com/home-assistant/actions/pull/136) [)](https://github.com/home-assistant/actions/commit/f6f29a7ee3fa0eccadf3620a7b9ee00ab54ec03b "Fix info helper when `config.*` is missing (#136)  The info helper checked whether app-specific config options exist even when no config.* was found. If the repo only uses the legacy build.yaml, it should not fail in that case.  Also break out of the config.* search loop in case when a file is found, without that the order of precedence of the suffixes is effectively swapped when compared with build.*.") | last monthApr 7, 2026 |
| [test\_files](https://github.com/home-assistant/actions/tree/master/test_files "test_files") | [test\_files](https://github.com/home-assistant/actions/tree/master/test_files "test_files") | [Update info helper for new app build workflows (](https://github.com/home-assistant/actions/commit/5752577ea7cc5aefb064b0b21432f18fe4d6ba90 "Update info helper for new app build workflows (#135)  * Update info helper for new app build workflows  Extract additional app metadata (name, slug, description, url) from config files and validate required options per the app configuration spec. The action now errors when required fields (name, version, slug, description, arch) are missing. Also marks build.* files as deprecated with a warning to move base image, build arguments and labels to Dockerfile.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Update tests for info helper required config validation  Add required fields (name, slug, description) to test config files and add companion config files alongside deprecated build test files so required field validation passes. Add workflow steps to validate the new outputs.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add warning if image is not set  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") [#135](https://github.com/home-assistant/actions/pull/135) [)](https://github.com/home-assistant/actions/commit/5752577ea7cc5aefb064b0b21432f18fe4d6ba90 "Update info helper for new app build workflows (#135)  * Update info helper for new app build workflows  Extract additional app metadata (name, slug, description, url) from config files and validate required options per the app configuration spec. The action now errors when required fields (name, version, slug, description, arch) are missing. Also marks build.* files as deprecated with a warning to move base image, build arguments and labels to Dockerfile.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Update tests for info helper required config validation  Add required fields (name, slug, description) to test config files and add companion config files alongside deprecated build test files so required field validation passes. Add workflow steps to validate the new outputs.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add warning if image is not set  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") | last monthApr 2, 2026 |
| [waitforjob](https://github.com/home-assistant/actions/tree/master/waitforjob "waitforjob") | [waitforjob](https://github.com/home-assistant/actions/tree/master/waitforjob "waitforjob") | [Apply adjustments to waitforjob action](https://github.com/home-assistant/actions/commit/444f4e4812f12941e18a353ebec2f6e7a03304fe "Apply adjustments to waitforjob action") | 3 years agoAug 29, 2023 |
| [.devcontainer.json](https://github.com/home-assistant/actions/blob/master/.devcontainer.json ".devcontainer.json") | [.devcontainer.json](https://github.com/home-assistant/actions/blob/master/.devcontainer.json ".devcontainer.json") | [Replace devcontainer (](https://github.com/home-assistant/actions/commit/7c15288c0f1d6560821f14eb7c6d24dcd383bdbd "Replace devcontainer (#84)") [#84](https://github.com/home-assistant/actions/pull/84) [)](https://github.com/home-assistant/actions/commit/7c15288c0f1d6560821f14eb7c6d24dcd383bdbd "Replace devcontainer (#84)") | 3 years agoFeb 27, 2023 |
| [LICENSE](https://github.com/home-assistant/actions/blob/master/LICENSE "LICENSE") | [LICENSE](https://github.com/home-assistant/actions/blob/master/LICENSE "LICENSE") | [Initial commit](https://github.com/home-assistant/actions/commit/9492b34d3ad454cf9643a8fc754ede193ada91b1 "Initial commit") | 7 years agoMar 4, 2019 |
| [README.md](https://github.com/home-assistant/actions/blob/master/README.md "README.md") | [README.md](https://github.com/home-assistant/actions/blob/master/README.md "README.md") | [Update README.md (](https://github.com/home-assistant/actions/commit/40145deb001bf72ce5b348c80b4df55918520a7e "Update README.md (#97)") [#97](https://github.com/home-assistant/actions/pull/97) [)](https://github.com/home-assistant/actions/commit/40145deb001bf72ce5b348c80b4df55918520a7e "Update README.md (#97)") | 3 years agoOct 6, 2023 |
| View all files |

## Repository files navigation

# actions

[Permalink: actions](https://github.com/home-assistant/actions#actions)

GitHub Actions and helper for Home Assistant workflows

## hassfest

[Permalink: hassfest](https://github.com/home-assistant/actions#hassfest)

_Run hassfest to validate standalone integration repositories._

**action**: `home-assistant/actions/hassfest@master`

example implementation:

```
name: Validate with hassfest

on:
  push:
  pull_request:
  schedule:
    - cron:  '0 0 * * *'

jobs:
  validate:
    runs-on: "ubuntu-latest"
    steps:
        - uses: "actions/checkout@v4"
        - uses: "home-assistant/actions/hassfest@master"
```

This will run the `hassfest` action on every push and pull request to all branches, as well as every midnight.

## Helpers

[Permalink: Helpers](https://github.com/home-assistant/actions#helpers)

_A collection of GitHub Action helpers, these are considered internal to the Home Assistant organization on GitHub and will change without warning._

- [git-init](https://github.com/home-assistant/actions/blob/master/helpers/git-init/action.yml)
- [info](https://github.com/home-assistant/actions/blob/master/helpers/info/action.yml)
- [jq](https://github.com/home-assistant/actions/blob/master/helpers/jq/action.yml)
- [verify-version](https://github.com/home-assistant/actions/blob/master/helpers/verify-version/action.yml)
- [version](https://github.com/home-assistant/actions/blob/master/helpers/version/action.yml)
- [version-push](https://github.com/home-assistant/actions/blob/master/helpers/version-push/action.yml)

## About

GitHub Actions for Home Assistant workflows


### Resources

[Readme](https://github.com/home-assistant/actions#readme-ov-file)

### License

[Apache-2.0 license](https://github.com/home-assistant/actions#Apache-2.0-1-ov-file)

### Code of conduct

[Code of conduct](https://github.com/home-assistant/actions#coc-ov-file)

### Contributing

[Contributing](https://github.com/home-assistant/actions#contributing-ov-file)

### Security policy

[Security policy](https://github.com/home-assistant/actions#security-ov-file)

### Uh oh!

There was an error while loading. [Please reload this page](https://github.com/home-assistant/actions).

[Activity](https://github.com/home-assistant/actions/activity)

[Custom properties](https://github.com/home-assistant/actions/custom-properties)

### Stars

[**43**\\
stars](https://github.com/home-assistant/actions/stargazers)

### Watchers

[**25**\\
watching](https://github.com/home-assistant/actions/watchers)

### Forks

[**33**\\
forks](https://github.com/home-assistant/actions/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Fhome-assistant%2Factions&report=home-assistant+%28user%29)

## [Releases\  1](https://github.com/home-assistant/actions/releases)

[1.0.0\\
Latest\\
\\
on Apr 16, 2020Apr 16, 2020](https://github.com/home-assistant/actions/releases/tag/1.0.0)

## Sponsor this project

- [https://www.openhomefoundation.org](https://www.openhomefoundation.org/)

## [Packages\  0](https://github.com/orgs/home-assistant/packages?repo_name=actions)

No packages published

### Uh oh!

There was an error while loading. [Please reload this page](https://github.com/home-assistant/actions).

## [Contributors\  17](https://github.com/home-assistant/actions/graphs/contributors)

- [![@ludeeus](https://avatars.githubusercontent.com/u/15093472?s=64&v=4)](https://github.com/ludeeus)
- [![@pvizeli](https://avatars.githubusercontent.com/u/15338540?s=64&v=4)](https://github.com/pvizeli)
- [![@edenhaus](https://avatars.githubusercontent.com/u/26537646?s=64&v=4)](https://github.com/edenhaus)
- [![@dependabot[bot]](https://avatars.githubusercontent.com/in/29110?s=64&v=4)](https://github.com/apps/dependabot)
- [![@agners](https://avatars.githubusercontent.com/u/34061?s=64&v=4)](https://github.com/agners)
- [![@mdegat01](https://avatars.githubusercontent.com/u/2037026?s=64&v=4)](https://github.com/mdegat01)
- [![@sairon](https://avatars.githubusercontent.com/u/211416?s=64&v=4)](https://github.com/sairon)
- [![@frenck](https://avatars.githubusercontent.com/u/195327?s=64&v=4)](https://github.com/frenck)
- [![@cdce8p](https://avatars.githubusercontent.com/u/30130371?s=64&v=4)](https://github.com/cdce8p)
- [![@claude](https://avatars.githubusercontent.com/u/81847?s=64&v=4)](https://github.com/claude)
- [![@jwillemsen](https://avatars.githubusercontent.com/u/47353?s=64&v=4)](https://github.com/jwillemsen)
- [![@hunterjm](https://avatars.githubusercontent.com/u/747670?s=64&v=4)](https://github.com/hunterjm)
- [![@marcolivierarsenault](https://avatars.githubusercontent.com/u/2634090?s=64&v=4)](https://github.com/marcolivierarsenault)
- [![@MartinHjelmare](https://avatars.githubusercontent.com/u/3181692?s=64&v=4)](https://github.com/MartinHjelmare)

[\+ 3 contributors](https://github.com/home-assistant/actions/graphs/contributors)

## Languages

- [Python100.0%](https://github.com/home-assistant/actions/search?l=python)

You can’t perform that action at this time.