[Skip to content](https://hacs.xyz/docs/publish/include/#who-can-submit)

# Include default repositories

## Who can submit? [¶](https://hacs.xyz/docs/publish/include/\#who-can-submit "Permanent link")

- Only the owner or a major contributor of a repository can submit a pull request (PR) to add it as a default.
- Custom integrations used for alpha or beta testing core integrations, or those that override core integrations, are not accepted as defaults. You can still use them as a [custom repository](https://hacs.xyz/docs/faq/custom_repositories/).

## Before you start [¶](https://hacs.xyz/docs/publish/include/\#before-you-start "Permanent link")

Make sure your repository meets these requirements:

- Your repository can be added to HACS as a custom repository.
- Your repository is public and hosted on GitHub.
- Add and pass these GitHub Actions:
  - [HACS Action](https://github.com/hacs/action) (Before you submit your PR, this action must pass without any errors or ignores.)
  - [Hassfest](https://github.com/home-assistant/actions#hassfest) (for integrations only)
- Create a new GitHub release (not just a tag, a full release) after the actions run successfully.

Once everything checks out, add your repository to the appropriate file in [hacs/default](https://github.com/hacs/default).

- [./appdaemon](https://github.com/hacs/default/blob/master/appdaemon) for AppDaemon apps
- [./integration](https://github.com/hacs/default/blob/master/integration) for integrations (custom components)
- [./plugin](https://github.com/hacs/default/blob/master/plugin) for plugins (custom cards, dashboards, etc.)
- [./python\_script](https://github.com/hacs/default/blob/master/python_script) for Python scripts (made for the Python script integration)
- [./template](https://github.com/hacs/default/blob/master/template) for templates (for custom templates)
- [./theme](https://github.com/hacs/default/blob/master/theme) for themes

### Additional information [¶](https://hacs.xyz/docs/publish/include/\#additional-information "Permanent link")

- Make sure to add your entry in the list alphabetically, and not at the end.
- Your PR must be editable, so don’t submit it from an organization account.
- In your fork of `hacs/default`, always create a new branch from `master` for your changes. Don’t use the `master` branch directly.
- If your repository is for a single or a limited set of countries, the `country` key needs to be set in the released `hacs.json` file.
- If you did not fill out the pull request template correctly, your PR will be closed without further notice.
- If you misrepresent your statements in the pull request, your PR will be closed without further notice.
- If you are not the owner of the repository, or a major contributor, your PR will be closed without further notice.
- If the repository does not meet the requirements for inclusion, your PR will be drafted for minor issues, and closed for major issues.
- If your PR is drafted, set it to ready for review when you are ready for it to be reviewed.

* * *

## What happens next? [¶](https://hacs.xyz/docs/publish/include/\#what-happens-next "Permanent link")

HACS is growing fast, with new repositories added almost daily, but new additions still take months to be reviewed and included. Want to check the status of your PR? Visit the [backlog](https://github.com/hacs/default/pulls?q=is%3Apr+is%3Aopen+draft%3Afalse+sort%3Acreated-asc) to see where things stand.

If you have questions or run into issues, check the documentation or reach out to the community. Good luck, and thank you for contributing!

When your repository is up for review, a set of automated checks are run. **All checks** must pass _unless_ otherwise agreed upon with the HACS team before the PR was opened. Here’s what’s checked:

### Check brands [¶](https://hacs.xyz/docs/publish/include/\#check-brands "Permanent link")

_Applies only to integrations._

Checks that your integration has a brand directory with at least an `icon.png` file.
If it doesn’t, it falls back to checking the domain in the [home-assistant/brands](https://github.com/home-assistant/brands) repository.

### Check manifest [¶](https://hacs.xyz/docs/publish/include/\#check-manifest "Permanent link")

Checks that your integration's manifest is valid. [Learn more](https://hacs.xyz/docs/publish/integration/#manifestjson) or see the [integration manifest documentation](https://developers.home-assistant.io/docs/creating_integration_manifest). Applies only to integrations.

### Check hacs-validation [¶](https://hacs.xyz/docs/publish/include/\#check-hacs-validation "Permanent link")

Runs the same validation that HACS itself uses to check your repository.

### Check HACS manifest [¶](https://hacs.xyz/docs/publish/include/\#check-hacs-manifest "Permanent link")

Checks that your `hacs.json` file contains at least a `name`. [See requirements](https://hacs.xyz/docs/publish/start#hacsjson)

### Check archived [¶](https://hacs.xyz/docs/publish/include/\#check-archived "Permanent link")

Checks if your repository is archived. It must be active.

### Check releases [¶](https://hacs.xyz/docs/publish/include/\#check-releases "Permanent link")

Checks that your repository has at least one release.

### Check owner [¶](https://hacs.xyz/docs/publish/include/\#check-owner "Permanent link")

Checks if the submitter is the owner or a major contributor to the repository.

### Check images [¶](https://hacs.xyz/docs/publish/include/\#check-images "Permanent link")

_Applies only to plugins and themes._

Checks that images are present in the readme file for HACS to render.

### Check repository [¶](https://hacs.xyz/docs/publish/include/\#check-repository "Permanent link")

Checks general repository requirements:

- The repository has a description
- The repository has issues enabled
- The repository has topics defined

### lint jq [¶](https://hacs.xyz/docs/publish/include/\#lint-jq "Permanent link")

Ensures that the files in your PR are valid JSON.

### lint sorted [¶](https://hacs.xyz/docs/publish/include/\#lint-sorted "Permanent link")

Ensures that the files in your PR are sorted correctly.

## After the PR is merged [¶](https://hacs.xyz/docs/publish/include/\#after-the-pr-is-merged "Permanent link")

After your PR is merged, your repository will be included in the next scheduled scan.

* * *

### Help and support

#### Resources

[Code of Conduct](https://github.com/hacs/.github/blob/master/CODE_OF_CONDUCT.md)

[Made with Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

#### Help us make these docs great!

All HACS docs are open source. See something that's wrong or unclear? Submit a pull request.

[Edit this page on GitHub](https://github.com/hacs/documentation/edit/main/source/docs/publish/include.md)

[Learn how to contribute](https://hacs.xyz/docs/contribute/documentation/)

#### Still need help?

- [Create an issue](https://hacs.xyz/docs/help/issues/)
- [Join the Discord server](https://discord.gg/apgchf8)

Back to top