---
name: fireapp-modern
description: "Plan or implement Fire.app Modern, a Windows-first desktop HTML prototyping app for frontend designers. Use when working on ERB templates, Bootstrap project creation and design settings, live preview, static builds, Bootstrap upgrades, or Windows packaging."
argument-hint: "Describe the Fire.app Modern feature, user workflow, or implementation question."
user-invocable: true
---

# Fire.app Modern

Build a Windows-first desktop tool for `fire`, a frontend designer who writes HTML and CSS but should never need to use a command line or manage language runtimes.

## Product Contract

- Keep the interface design-focused: projects, previews, builds, errors, and settings must be operable from the app.
- Use `Fire.app Modern` as the working name. It is a private, personal tool.
- Do not target binary compatibility with legacy Fire.app projects, `config.rb`, Compass, JRuby gems, or old extensions.
- Preserve familiar ERB authoring in newly created projects. The app owns all runtime and build-tool complexity.
- Prefer safe, explicit changes. Project upgrades must not silently overwrite design settings or generated output.

## Supported Template Surface

V1 projects use `.html.erb` files and compile to static `.html` files. Support:

- ERB output and control tags: `<%= ... %>` and `<% ... %>`.
- Variables, strings, arrays, hashes, conditions, loops, and ranges.
- `_layout.html.erb`, `yield`, named `content_for`, and named yields.
- Underscored partials rendered through `render`.
- Page-level layout selection.
- Bundled helpers for common prototype content, including lorem text.
- Interface-created example data and JSON project data files.

Do not expose user-written Ruby helpers or a `helpers.rb` file in V1. This retains a predictable and secure template boundary. Design future extensions as a versioned, documented plugin API rather than allowing unrestricted Ruby execution.

## New Project Workflow

1. Ask for project name and destination.
2. Offer a starter type: blank page, marketing site, dashboard, or form flow.
3. Let the user choose a supported Bootstrap version for the project; do not silently substitute the latest release.
4. Collect the basic visual settings listed below and show a live preview before creation.
5. Create a self-contained project with ERB pages, layouts, partials, Sass entry files, assets, JavaScript, data, and an app-owned project manifest.
6. Start preview automatically and display an actionable build status.

Create a project layout equivalent to:

```text
project/
  _layout.html.erb
  index.html.erb
  partials/
  sass/
    _bootstrap-settings.scss
    application.scss
  javascripts/
  assets/
  data/
  firemodern.json
```

`application.scss` imports `_bootstrap-settings.scss` before Bootstrap. The app writes visual choices to both the manifest and the generated settings file, and treats the manifest as the source of truth.

## Bootstrap Design Controls

For V1, expose only high-value controls that a designer can understand without Sass knowledge:

- Brand colors: primary, secondary, success, danger, warning, info, light, and dark.
- Foundation: body background, body text, link color, font family, base font size, and line height.
- Shape: global, small, and large radii; button, input, and card radii.
- Spacing and layout: base spacer, container widths, and grid gutter.
- Buttons: padding, font size, font weight, border width, shadow, and hover state.
- Forms: input height, padding, border color, focus ring, and label treatment.
- Cards and modals: backgrounds, borders, shadows, and header/footer spacing.
- Global visual toggles: rounded corners, shadows, gradients, smooth scrolling, and dark mode.

Do not surface every Bootstrap Sass variable in V1. Reserve an Advanced panel for a later release, with search, plain-language help, reset controls, and visible preview impact.

## Editing and Preview Workflow

1. The user changes ERB, HTML, Sass, CSS, or design controls.
2. Watch the project and rebuild only the affected output.
3. For CSS-only changes, update styles without a disruptive full reload when possible.
4. For template, data, or asset changes, reload the preview.
5. Show the filename, line, phase, and a plain-language fix for errors.
6. Keep the last successful preview available if the current build fails.

The build command exports clean static files without the development reload client.

## Bootstrap Upgrade Workflow

Never auto-upgrade a project in place.

1. Detect an available supported Bootstrap release.
2. Show the installed and target versions, plus relevant breaking changes.
3. Create a restorable project snapshot.
4. Compile in a temporary location.
5. Map project design settings to the target version and report unsupported, renamed, or changed options.
6. Let the user compare the current and upgraded preview.
7. Apply only after explicit confirmation and retain a one-click rollback.

V1 may only provide update detection and a confirmed manual upgrade. Automated migration and visual regression comparison are later milestones. New projects always let the user choose from the app's supported Bootstrap versions.

## Windows Delivery

- Develop and test Windows first.
- Package all required runtimes so the user never installs Ruby, Sass, Node.js, or command-line tools.
- Use GitHub Actions on hosted Windows runners to produce `.msi` and `.exe` installers; local packaging hardware is not required.
- Publish installer artifacts to GitHub Releases.
- Clearly acknowledge that an unsigned private build can show Windows SmartScreen warnings.

## Decision Rules

- When a feature makes the app easier for a designer but expands an unsafe runtime surface, choose a constrained built-in capability first.
- When a setting belongs to Bootstrap, represent it in `firemodern.json` and generate Sass from it; do not edit Bootstrap vendor source.
- When a feature is useful only for power users, keep it out of the initial setup flow and consider it for an Advanced panel.
- When adding an external tool, hide installation and command execution behind the app UI and package it with the installer.
- When requirement details are missing, ask about the authoring workflow and visual outcome rather than tool or language preferences.

## Completion Checks

A feature is complete only when:

1. It works from the graphical interface without command-line steps.
2. It has a clear success, progress, and error state.
3. It does not erase user-authored templates, Sass, assets, or settings.
4. Its build output is reproducible from the project manifest.
5. It has a focused automated test or a documented manual verification path.
6. It works on Windows and does not assume a locally installed developer runtime.