
# ppx_debug + VSCode

This extension is able to load traces recorded using [ppx_debug](https://github.com/dariusf/ppx_debug) and provides a UI like that of an interactive debugger.

Select `Load trace` and pick debugger.json to get started.

| Keys | Action |
| --- | --- |
| <kbd>Shift</kbd> <kbd>Alt</kbd> <kbd>Cmd</kbd> <kbd>←</kbd> | Step back |
| <kbd>Shift</kbd> <kbd>Alt</kbd> <kbd>Cmd</kbd> <kbd>→</kbd> | Step forward |
| <kbd>Shift</kbd> <kbd>Alt</kbd> <kbd>Cmd</kbd> <kbd>↓</kbd> | Run forward to this point |
| <kbd>Shift</kbd> <kbd>Alt</kbd> <kbd>Cmd</kbd> <kbd>↑</kbd> | Run backwards to this point |

## Installation

This extension is in early development, so it's not currently on the VSCode marketplace.

See the [CI config](.github/workflows/ci.yml) for how to build it, or download a recent vsix from the CI artifacts.

## Development

```sh
git clone git@github.com:dariusf/vscode-mock-debug.git
git remote add upstream git@github.com:microsoft/vscode-mock-debug.git

# update
git fetch upstream main
git merge upstream/main

# develop
code .
# press F5

# release
./deploy.sh
```
