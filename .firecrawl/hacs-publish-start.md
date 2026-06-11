[Skip to content](https://hacs.xyz/docs/publish/start/#general-requirements)

# General

For your repository to be added, several criteria need to be met.

- [General requirements](https://hacs.xyz/docs/publish/start/#general-requirements)
- [Integration requirements](https://hacs.xyz/docs/publish/integration/) for integrations.
- [Plugin requirements](https://hacs.xyz/docs/publish/plugin/) for plugins.
- [AppDaemon requirements](https://hacs.xyz/docs/publish/appdaemon/) for AppDaemon apps.
- [Python\_scripts requirements](https://hacs.xyz/docs/publish/python_script/) for python scripts.
- [Template requirements](https://hacs.xyz/docs/publish/template/) for custom templates.
- [Theme requirements](https://hacs.xyz/docs/publish/theme/) for themes.

## General requirements [¶](https://hacs.xyz/docs/publish/start/\#general-requirements "Permanent link")

Only public repositories on GitHub will work with HACS.

### Description [¶](https://hacs.xyz/docs/publish/start/\#description "Permanent link")

Your repository on GitHub needs to have a description that in a few words describes the purpose of the repository. _This description is used in HACS._

### Topics [¶](https://hacs.xyz/docs/publish/start/\#topics "Permanent link")

Your repository on GitHub needs to have [topics](https://docs.github.com/en/github/administering-a-repository/classifying-your-repository-with-topics). _Topics are not displayed in HACS, but they can be used for searchability in the HACS store._

### README [¶](https://hacs.xyz/docs/publish/start/\#readme "Permanent link")

Your repository needs to have a [readme](https://github.com/matiassingers/awesome-readme) with information about how to use it.

### hacs.json [¶](https://hacs.xyz/docs/publish/start/\#hacsjson "Permanent link")

This is a special manifest file that defines the information that HACS shows in the UI and what files/paths that HACS should use. _This file must be located in the root of your repository._

The following keys are supported:

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | The display name that will be used in the HACS UI. |
| `content_in_root` | bool | No | Indicates whether the content is in the root of the repository as opposed to in a subdirectory. |
| `zip_release` | bool | No | Indicates whether the content is in a zipped archive when releases are published on GitHub. If you use this you also need to add `filename`. **This is only supported for integrations.** |
| `filename` | string | No | Name of the file HACS should look for, only applies to single item types (plugin, theme, template, python\_scripts, zip\_release). |
| `hide_default_branch` | bool | No | Tells HACS to not offer downloading the default branch. |
| `country` | string | No | Two character country code in ISO 3166-1 alpha-2 format. [ISO 3166-1 alpha-2 on Wikipedia](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) |
| `homeassistant` | string | No | The minimum required Home Assistant version. |
| `hacs` | string | No | The minimum required HACS version. |
| `persistent_directory` | string | No | A relative path (within the integration directory) that will be kept safe during upgrades. \_Can only be used with integrations.\* |

Tip

The [`AwesomeVersion` demo](https://awesomeversion.ludeeus.dev/) can validate and check version compares.
That is the same library that HACS and Home Assistant use when checking versions.

**examples:**

hacs.json

```
{
  "name": "My awesome thing",
  "content_in_root": true,
  "filename": "my_super_awesome_thing.js",
  "country": ["NO", "SE", "DK"]
}
```

hacs.json

```
{
  "name": "My awesome thing",
  "country": "NO",
  "homeassistant": "0.99.9",
  "persistent_directory": "userfiles"
}
```

Allow Home Assistant beta versions by appending `b0`. Without `b0`, only official releases will be allowed.

hacs.json

```
{
  "name": "My awesome thing",
  "country": "NO",
  "homeassistant": "2021.12.0b0",
  "persistent_directory": "userfiles"
}
```

### Versions [¶](https://hacs.xyz/docs/publish/start/\#versions "Permanent link")

If the repository uses GitHub releases, the tag name from the latest release is used to set the remote version. _Just publishing tags is not enough, you need to publish releases._

If the repository does not use tags, the 7 first characters of the last commit will be used.

## Want to add your repository to the store as a default? [¶](https://hacs.xyz/docs/publish/start/\#want-to-add-your-repository-to-the-store-as-a-default "Permanent link")

[See here for how to add a custom repository.](https://hacs.xyz/docs/publish/include/)

## My links [¶](https://hacs.xyz/docs/publish/start/\#my-links "Permanent link")

Tell your users that your repository can be tracked with HACS by adding a [my-link](https://my.home-assistant.io/) link to your documentation.

Generate a unique link for your repository here: [https://my.home-assistant.io/create-link/?redirect=hacs\_repository](https://my.home-assistant.io/create-link/?redirect=hacs_repository)

* * *

### Help and support

#### Resources

[Code of Conduct](https://github.com/hacs/.github/blob/master/CODE_OF_CONDUCT.md)

[Made with Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

#### Help us make these docs great!

All HACS docs are open source. See something that's wrong or unclear? Submit a pull request.

[Edit this page on GitHub](https://github.com/hacs/documentation/edit/main/source/docs/publish/start.md)

[Learn how to contribute](https://hacs.xyz/docs/contribute/documentation/)

#### Still need help?

- [Create an issue](https://hacs.xyz/docs/help/issues/)
- [Join the Discord server](https://discord.gg/apgchf8)

Back to top