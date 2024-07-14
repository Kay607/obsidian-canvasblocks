![GitHub Release](https://img.shields.io/github/v/release/Kay607/obsidian-canvasblocks)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22canvasblocks%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

# Canvas Blocks
Canvas Blocks allows you to integrate python snippets with Obsidian Canvas.

There are 2 modes for this plugin: Simple and Workflow

Workflow scripts are recommended for new users as the inputs required are intuitive but they take more effort to set up.

Simple scripts take a maximum of 1 optional input as well as optional settings processes it. It allows scripts to be very quickly executed with an input. Examples include generating a QR code from text, making an image grayscale and rotating an image.

Workflow allows more complex usage by chaining together multiple scripts. This is useful for repeated use for more complex processing. All of the simple scripts can also me made into workflow scripts but it is slightly slower to run.

It is recommended that you set a hotkey for `Canvas Blocks: Execute canvas script` as you will need to execute this command every time you execute a script

The python version used by the plugin will be automatically detected. This can be overridden using the `Python path` setting (example: `F:\Program Files\Python310\python`). The path must end in the python executable name (`python`, `python.exe`, `python3` or `python3.exe`)

## Usage
### Simple
- Copy the text of one of the [examples](examples/Simple) into a canvas text node or copy it into a markdown file and drag the file into a canvas
- Select a script node and run the command `Canvas Blocks: Execute canvas script` to execute it
- Scripts can be given a parameter by dragging another node over the script node before executing it. The script will then use this to process
- For some scripts, edges can be used for additional parameters by pointing the arrow into the script node
- Some of these example scripts may output data into the plugin's data folder which can be altered in settings (default is the vault's root directory). This folder must be manually created for the scripts to work correctly if it is changed from the default

Refer to the Simple Demonstrations heading in this readme for more information

### Workflow
- Go to the plugin's settings and set the `Workflow script folder`. You should then create this folder in your vault
- Copy one of the [workflow examples](examples/Workflow) into the `Workflow script folder` folder. Each script will have 2 code blocks in it. Both are necessary
- Run the `Canvas Blocks: Add workflow script` command and select the script which you want to add. This is the only way to add scripts to the canvas. If you copy and paste a script, it will not work correctly. If you accidentally delete part of a script, delete the rest of it and add the script back
- Connect all required inputs
- Select the group (the gray box) of the script to run
- Run the `Canvas Blocks: Execute canvas script` command to execute the script. This will run the script selected and all that are connected by its inputs. It will not execute any connected to the outputs. If the outputs are used, select the script that uses it
- If you use some of the [workflow examples](examples/Workflow), you may see no change as it outputs data rather than displaying it. You may need to attach further nodes such as ![Save Image](https://github.com/Kay607/obsidian-canvasblocks/blob/main/examples/Workflow/Save%20Image.md) to see the outputs

It is recommended that you set a hotkey for `Canvas Blocks: Add workflow script` as you will need to execute this command every time you add a workflow script to the canvas

Refer to the Workflow Demonstrations heading in this readme for more information

## Demonstrations
### Simple
![QRCodeExample](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/fe01115b-3b0a-449e-b09b-1c8ec78a4334)

![ResizeExample](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/6a768dcb-96c3-4d84-bde0-8538bc88010a)

### Workflow
![image](https://github.com/Kay607/obsidian-canvasblocks/assets/54263177/1a4f1235-3be4-4304-a126-e9658feb6cdb)


## Writing Scripts
You can write your own scripts for either the Simple or Workflow usage of the plugin or use the premade scripts: [Simple examples](examples/Simple) or [Workflow examples](examples/Workflow)

If you want to request a script to be made, create an [issue](https://github.com/Kay607/obsidian-canvasblocks/issues) and mark it with the `script request` tag. Please fully describe the usage of the script, state whether you want a Simple or Workflow script and if possible, give an example usage

### Library
The plugin contains a library for useful functions to interface with the canvas such as these and more

- `install_dependency` Checks if a python module is installed and installs it with `pip` if it is not
- `create_text_node` Creates a text node in the canvas
- `create_file_node` Creates a file node in the canvas

For more information on this, read the provided library at [Canvas Blocks Python library](resources/canvasblocks-python-lib.py). All functions provided are well documented.

### Simple
The plugin exposes several variables to the script to allow it to process parameters. All node data is provided in the [JSON Canvas](https://jsoncanvas.org/) format used by Obsidian Canvas in the form of python objects

- `script_data` A copy of the script being executed is provided
- `parameter_data` The node data of the parameter node (the node which overlaps with the script in the canvas). If none are overlapping, this will be `{}`
- `arrow_parameters` An list containing all nodes with an edge pointing into the script
- `vault_path` The absolute path to the root directory of the vault
- `plugin_folder` A relative path from the vault root. This is set in the settings but defaults to `Assets/CanvasBlocks`. This can be used for storing data generated by scripts
- `canvas_path` A relative path from the vault root to the canvas file which the script is running from
- `has_parameter` A boolean value for whether there is a parameter node (only considers overlapping nodes, not ones linked by edges)

### Workflow
Each workflow script must contain a `canvasblocksettings` and `pycanvasblock` code block

The `canvasblocksettings` must be JSON in the following format:

```json
{
	"ioConnections":
	{
		"YOUR_CONNECTION_NAME": {
			"direction": "input|output",
			"type": "any|image|text|file|integer|float|YOUR_DATA_TYPE"
		}
	}
}
```

There can be multiple connections, more can be added by creating a new entry in the `ioConnections` dictionary where the key is the connection name. In the above example, `YOUR_CONNECTION_NAME` can be any name and the `type` can be any of the shown types or your own

See the [Workflow examples](examples/Workflow) for more examples on how to structure the `canvasblocksettings` block

---

The `pycanvasblock` block contains the python code which will be ran. The following is the data provided to the script as variables which can be used for processing

- `in_data` This is the input data to the workflow script from the previous scripts/nodes which are connected as inputs
- `out_data` This is the output data from the workflow script to the next scripts which use it as inputs
- `script_settings` This will be a copy of the `canvasblocksettings` code block from the script structured as a python dictionary and not as a string
- `script_data` A copy of the script node which is being executed is provided (this will be a string containing both code blocks)
- `vault_path` The absolute path to the root directory of the vault
- `plugin_folder` A local path from the vault root. This is set in the settings but defaults to `Assets/CanvasBlocks`. This can be used for storing data generated by scripts
- `canvas_path` A relative path from the vault root to the canvas file which the script is running from

#### Handling inputs and outputs
The `in_data` variable will contain a dictionary. The key to the dictionary will be the name of the connection specified in the `canvasblocksettings` code block. The value will depend on the type specified in the connection.

Example: `print(in_data["Text connection name"])`

- `image`: A PIL object containing an image
- `text`: A Python `str`
- `file`: A dictionary of a node in the [JSON Canvas](https://jsoncanvas.org/) format
- `integer`: A Python `int`
- `float`: A python `float`
- `YOUR_DATA_TYPE`: Any JSON serializable object

To output data you must set the value on the `out_data` dictionary. The key will be the name of the connection specified in the `canvasblocksettings` code block and the value also will depend on the type specified in the connection.

You don't need to attempt to serialize the data before setting the value in the dictionary. This means that PIL images can be set directly without needing to save the image as bytes/base64 string
Example: `out_data["Text connection name"] = "Hello world!"`

Example: `out_data["Image connection name"] = Image.new('RGB', (100, 100))`

#### Handling API Keys
API Keys, tokens or any other data can be stored in one of the "variables". This can be accessed in the settings
![image](https://github.com/user-attachments/assets/c9735bd8-0a03-44e0-a801-1cb1126bd613)

Add a new variable and set the name and value of it. This name must match the name used in the scripts. Certain example scripts such as [Send Discord Image](examples/Workflow/Send Discord Message.md) will have a specific name required, for this example it is `discord_token` for the bot's token

To access this in a script, you must grant intents to the script by setting `allowedVariables` in the `canvasblocksettings` code block. This will work in Simple and Workflow scripts. The value of this setting must be a list of strings where each string is the name of the variable

An example of this from [Send Discord Image](examples/Workflow/Send Discord Message.md)

```canvasblocksettings
{
	"type": "workflow",
	"ioConnections": {
		"Data": {
			"direction": "input",
			"type": "file"
		},
		"Channel ID": {
			"direction": "input",
			"type": "integer"
		}
	},
	"allowedVariables": ["discord_token"]
}
```

This allows the script to access the variable. To use it in python, you must access the `injected_variables` dictionary such as `token = injected_variables["discord_token"]`. This will always return a string with the value set in the settings


## Installation

Install from the Obsidian `Comunity Plugins` tab or [Canvas Blocks](https://obsidian.md/plugins?id=canvasblocks)

You can manually install by adding `Kay607/obsidian-canvasblocks` to [BRAT](https://github.com/TfTHacker/obsidian42-brat)

After enabling the plugin, close and reopen all canvas files which use this script

## Contribution

Feel free to create an [issue](https://github.com/Kay607/obsidian-canvasblocks/issues) or [pull request](https://github.com/Kay607/obsidian-canvasblocks/pulls)

If you write a script which may be useful to others, you can create a [pull request](https://github.com/Kay607/obsidian-canvasblocks/pulls) to have it added to the repository

### Building

Requires npm to be installed

- `git clone https://github.com/Kay607/obsidian-canvasblocks --recursive` Clone the repository into the `.obsidian/plugins` folder
- `npm i` Install modules
- `npm run dev` Builds the plugin when a change is made
