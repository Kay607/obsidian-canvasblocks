![GitHub Release](https://img.shields.io/github/v/release/Kay607/obsidian-canvasblocks)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22canvasblocks%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

# Canvas Blocks
Canvas Blocks allows you to integrate python snippets with Obsidian Canvas.

There are 2 modes for this plugin: Simple and Workflow

Workflow scripts are recommended for new users as the inputs required are intuitive but they take more effort to set up.

Simple scripts take a maximum of 1 optional input as well as optional settings processes it. It allows scripts to be very quickly executed with an input. Examples include generating a QR code from text, making an image grayscale and rotating an image.

Workflow allows more complex usage by chaining together multiple scripts. This is useful for repeated use for more complex processing. All of the simple scripts can also me made into workflow scripts but it is slightly slower to run.

It is recommended that you set a hotkey for `Canvas Blocks: Execute canvas script` as you will need to execute this command every time you execute a script

## Usage
### Simple

- Copy the text of one of the [examples](examples/Simple) into a canvas text node or copy it into a markdown file and drag the file into a canvas

- Select a script node and run the command `Canvas Blocks: Execute canvas script` to execute it

- Scripts can be given a parameter by dragging another node over the script node before executing it. The script will then use this to process

- For some scripts, edges can be used for additional parameters by pointing the arrow into the script node

Refer to the Simple Demonstrations heading in this readme for more information

### Workflow

- Go to the plugin's settings and set the `Workflow script folder`. You should then create this folder in your vault

- Copy one of the [workflow examples](examples/Workflow) into the `Workflow script folder` folder

- Run the `Canvas Blocks: Add workflow script` command and select the script which you want to add

- Connect all required inputs

- Select the group (the gray box) of the script to run

- Run the `Canvas Blocks: Execute canvas script` command to execute the script. This will run the script selected and all that are connected by its inputs. It will not execute any connected to the outputs. If the outputs are used, select the script that uses it

- If you use some of the [workflow examples](examples/Workflow), you may see no change as it outputs data rather than displaying it. You may need to attach further nodes such as ![Save Image]([examples/Workflow/Save Image.md](https://github.com/Kay607/obsidian-canvasblocks/blob/main/examples/Workflow/Save%20Image.md) to see the outputs

It is recommended that you set a hotkey for `Canvas Blocks: Add workflow script` as you will need to execute this command every time you add a workflow script to the canvas

Refer to the Workflow Demonstrations heading in this readme for more information

## Demonstrations
### Simple
![QRCodeExample](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/fe01115b-3b0a-449e-b09b-1c8ec78a4334)

![ResizeExample](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/6a768dcb-96c3-4d84-bde0-8538bc88010a)

### Workflow
![image](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/1a4f1235-3be4-4304-a126-e9658feb6cdb)


Scripts can either be written as a text node in canvas or in a markdown file

The code is inside of a code block using the language `pycanvasblock`

```pycanvasblock
file = get_parameter_file("r")
text = file.read()
file.close()

file = get_parameter_file("w")
file.write(text.upper())
file.close()
```

### Examples
Example scripts can be found at [Examples](examples)

Some of these example scripts may output data into the plugin's data folder which can be altered in settings (default `Assets/CanvasBlocks`). This folder must be created for the scripts to work correctly

The python version used by the plugin will be automatically detected. This can be overridden using the `Python path` setting (example "F:\Program Files\Python310\python"). The path must end in the python executable name (`python`, `python.exe`, `python3` or `python3.exe`)

## Writing Scripts

The plugin exposes several variables to the script to allow it to process parameters. All node data is provided in the [JSON Canvas](https://jsoncanvas.org/) format used by Obsidian Canvas in the form of python objects

`script_data` A copy of the script being executed is provided

`parameter_data` The node data of the parameter node (the node which overlaps with the script in the canvas). If none are overlapping, this will be `{}`

`arrow_parameters` An list containing all nodes with an edge pointing into the script

`vault_path` The absolute path to the root directory of the vault

`plugin_folder` A local path from the vault root. This is set in the settings but defaults to `Assets/CanvasBlocks`. This can be used for storing data generated by scripts

`has_parameter` A boolean value for whether there is a parameter node (only considers overlapping nodes, not ones linked by edges)

---

As well as this, the plugin contains a library for useful functions to interface with the canvas such as these and more

`install_dependency` Checks if a python module is installed and installs it with `pip` if it is not

`create_text_node` Creates a text node in the canvas

`create_file_node` Creates a file node in the canvas

For more information on this, read the provided library at [Canvas Blocks Python Library](resources/canvasblocks-python-lib.py)


## Installation

Install from the Obsidian `Comunity Plugins` tab or [Canvas Blocks](https://obsidian.md/plugins?id=canvasblocks)

You can manually install by adding `Kay607/obsidian-canvasblocks` to [BRAT](https://github.com/TfTHacker/obsidian42-brat)

## Contribution

Feel free to create an [issue](https://github.com/Kay607/obsidian-canvasblocks/issues) or [pull request](https://github.com/Kay607/obsidian-canvasblocks/pulls)

### Building

Requires npm to be installed

`git clone https://github.com/Kay607/obsidian-canvasblocks --recursive` Clone the repository into the `.obsidian/plugins` folder

`npm i` Install modules

`npm run dev` Builds the plugin when a change is made

