[Skip to content](https://hacs.xyz/docs/publish/action/#action-inputs)

# GitHub Action

You can use GitHub actions to validate your repository with HACS.
This will make sure that your repository can be validated in HACS after changes to your repository or HACS itself.

This action uses the same code as HACS to validate a repository.

The action has 3 run types:

- For the [hacs/default repo](https://github.com/hacs/default) it is used to validate new default repositories.
- If you use releases the latest release will be checked, if not the default branch will be checked.
- If you have it set up for PRs in your repository, it will run against the fork/branch that made the PR.
- If you have it set up for pushes, it will run against the branch you push to.

The action itself lives [here](https://github.com/hacs/action) and you are free to inspect the code and/or make a PR to add changes.

## Action inputs [¶](https://hacs.xyz/docs/publish/action/\#action-inputs "Permanent link")

| Input | Description |
| --- | --- |
| `ignore` | A space separated list of ignored checks |
| `category` | The type of repository (`integration`, `plugin`, `template`, `theme`, `appdaemon`, `python_script`) |

## Ignorable checks [¶](https://hacs.xyz/docs/publish/action/\#ignorable-checks "Permanent link")

All these checks can be disabled with `with.ignore`. Use a string, and if you ignore multiple ones, separate them with spaces.

| Check | More info | Description |
| --- | --- | --- |
| `archived` | [More info](https://hacs.xyz/docs/publish/include/#check-archived) | Checks if the repository is archived |
| `brands` | [More info](https://hacs.xyz/docs/publish/include/#check-brands) | Checks if there are brand assets available |
| `description` | [More info](https://hacs.xyz/docs/publish/include/#check-repository) | Checks if the repository has a description |
| `hacsjson` | [More info](https://hacs.xyz/docs/publish/include/#check-hacs-manifest) | Checks that hacs.json exists |
| `images` | [More info](https://hacs.xyz/docs/publish/include/#check-images) | Checks that the info file has images |
| `information` | [More info](https://hacs.xyz/docs/publish/include/#check-repository) | Checks that the repo has an information file |
| `issues` | [More info](https://hacs.xyz/docs/publish/include/#check-repository) | Checks that issues are enabled |
| `topics` | [More info](https://hacs.xyz/docs/publish/include/#check-repository) | Checks that the repository has topics |

## Using a specific version [¶](https://hacs.xyz/docs/publish/action/\#using-a-specific-version "Permanent link")

To use a specific version of this action instead of `main` set the value after `@` in the `uses` definition, like:

```
uses: hacs/action@xx.xx.x
```

If you do this, please enable [dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates) to help you keep that up to date.

To use it, follow these steps:

1. Go to your repository on GitHub
2. Click on "Create new file"
3. For the filename, paste .github/workflows/validate.yaml
4. Paste the following contents:
5. Change the value of the `category` key, this needs to be one of: `appdaemon`, `integration`, `plugin`, `python_script`, `template`, `theme`

.github/workflows/validate.yml

```
name: Validate

on:
  push:
  pull_request:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions: {}

jobs:
  validate-hacs:
    runs-on: "ubuntu-latest"
    steps:
      - name: HACS validation
        uses: "hacs/action@main"
        with:
          category: "CHANGE_ME!"
```

This will run on every PR and push and at midnight every day. And `workflow_dispatch` allows you to run the action on demand from the Actions tab.

Tip

If you maintain an integration, you can also validate your integration with [hassfest](https://developers.home-assistant.io/blog/2020/04/16/hassfest).

* * *

### Help and support

#### Resources

[Code of Conduct](https://github.com/hacs/.github/blob/master/CODE_OF_CONDUCT.md)

[Made with Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

#### Help us make these docs great!

All HACS docs are open source. See something that's wrong or unclear? Submit a pull request.

[Edit this page on GitHub](https://github.com/hacs/documentation/edit/main/source/docs/publish/action.md)

[Learn how to contribute](https://hacs.xyz/docs/contribute/documentation/)

#### Still need help?

- [Create an issue](https://hacs.xyz/docs/help/issues/)
- [Join the Discord server](https://discord.gg/apgchf8)

Back to top