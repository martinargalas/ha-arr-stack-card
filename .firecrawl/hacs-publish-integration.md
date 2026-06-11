[Skip to content](https://hacs.xyz/docs/publish/integration/#requirements)

# Integrations

## Requirements [¶](https://hacs.xyz/docs/publish/integration/\#requirements "Permanent link")

For an integration repository to be valid, it must meet the requirements below.

### Repository structure [¶](https://hacs.xyz/docs/publish/integration/\#repository-structure "Permanent link")

- There must only be one integration per repository, i.e. there can only be one subdirectory to `ROOT_OF_THE_REPO/custom_components/`. _If there are more than one, only the first one will be managed._
- All files required for the integration to run must be located inside the directory `ROOT_OF_THE_REPO/custom_components/INTEGRATION_NAME/`.

#### OK example: [¶](https://hacs.xyz/docs/publish/integration/\#ok-example "Permanent link")

```
custom_components/awesome/__init__.py
custom_components/awesome/sensor.py
custom_components/awesome/manifest.json
README.md
hacs.json
```

#### Not OK example (1): [¶](https://hacs.xyz/docs/publish/integration/\#not-ok-example-1 "Permanent link")

```
awesome/__init__.py
awesome/sensor.py
awesome/manifest.json
awesome/hacs.json
README.md
```

#### Not OK example (2): [¶](https://hacs.xyz/docs/publish/integration/\#not-ok-example-2 "Permanent link")

```
__init__.py
sensor.py
manifest.json
README.md
hacs.json
```

_if you have `content_in_root` set to `true` in [`hacs.json`](https://hacs.xyz/docs/publish/start/#hacsjson) this is valid._

### manifest.json [¶](https://hacs.xyz/docs/publish/integration/\#manifestjson "Permanent link")

In your integration directory you must have a `manifest.json` file, which must at least define these keys:

- `domain`
- `documentation`
- `issue_tracker`
- `codeowners`
- `name`
- `version`

Check the official Home Assistant [documentation](https://developers.home-assistant.io/docs/creating_integration_manifest) for the values of those keys.

### Brand assets [¶](https://hacs.xyz/docs/publish/integration/\#brand-assets "Permanent link")

You must provide brand assets for your integration. You can do this by adding a [`brand` directory in your repository](https://developers.home-assistant.io/docs/creating_integration_file_structure#brand-images---brand) with at least an `icon.png` file.

### GitHub releases (optional) [¶](https://hacs.xyz/docs/publish/integration/\#github-releases-optional "Permanent link")

It is preferred but not required to publish releases in your repository.

_If you publish releases in your repository, HACS will present the user with a nice selection view of the 5 latest releases together with the default branch when they are downloading or upgrading your integration._

_If you don't publish releases in your repository, HACS will use the files in the branch marked as default._

### References and examples [¶](https://hacs.xyz/docs/publish/integration/\#references-and-examples "Permanent link")

A good template to use as a reference is [blueprint](https://github.com/custom-components/blueprint). You can generate a template similar to blueprint and customize it to your context by using [cookiecutter-homeassistant-custom-component](https://github.com/oncleben31/cookiecutter-homeassistant-custom-component).

* * *

### Help and support

#### Resources

[Code of Conduct](https://github.com/hacs/.github/blob/master/CODE_OF_CONDUCT.md)

[Made with Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

#### Help us make these docs great!

All HACS docs are open source. See something that's wrong or unclear? Submit a pull request.

[Edit this page on GitHub](https://github.com/hacs/documentation/edit/main/source/docs/publish/integration.md)

[Learn how to contribute](https://hacs.xyz/docs/contribute/documentation/)

#### Still need help?

- [Create an issue](https://hacs.xyz/docs/help/issues/)
- [Join the Discord server](https://discord.gg/apgchf8)

Back to top