# Required to support union typings on Python versions below 3.10.0
# Versions >= 3.10.0 are also supported
from __future__ import annotations

import base64
import io
import json
import importlib
import subprocess
import os
import sys
import sysconfig
from typing import IO

# Replace the default python print function with one which will call console.log in the obisidan console
send_command = print
print = None
def print(*args):
    """Outputs the arguments to the console"""
    send_command(json.dumps({"command": "PRINT", "text": ' '.join(map(str, args))}))

def notice(*args):
    """Sends a notice pop up in Obsidian
    """
    send_command(json.dumps({"command": "NOTICE", "text": ' '.join(map(str, args))}))

def install_dependency(module: str, import_name: str = None):
    """Installs a module required by a script

    Args:
        module (str): The name of the module used to install with "pip install"
        import_name (str, optional): The name of the module used when importing. Leave as None if it is the same as "module" Defaults to None.
    """

    if import_name == None:
        import_name = module
    try:
        importlib.import_module(import_name)
    except ImportError:
        pip_path = sysconfig.get_path('scripts') + '/pip'
        output = subprocess.check_output([pip_path, 'install', module], stderr=subprocess.STDOUT)
        print(output)
        

# Read data dictionary from stdin
data_dict = json.loads(sys.stdin.readline())

# Create variables from the data dictionary
for variable_name, variable_value in data_dict.items():
    locals()[variable_name] = variable_value
del data_dict


if execution_type == "workflow": # type: ignore
    install_dependency("pillow", "PIL")
    from PIL import Image

    for ioName, value in in_data.items(): # type: ignore
        ioType = script_settings["ioConnections"][ioName]["type"] # type: ignore
        newValue = value

        if ioType == "image":
            decoded_data = base64.b64decode(value)
            image_buffer = io.BytesIO(decoded_data)
            newValue = Image.open(image_buffer)

        in_data[ioName] = newValue # type: ignore


def get_text_from_node(node_data: str) -> str|None:
    """If node_data is a text node, the text will be returned
    If node_data is a file node and the extension of the file is .md or .txt, the file will be read and the text returned
    If node_data is a file node and the extention is invalid, None will be returned
    If node_data is a link node, the url will be returned

    Args:
        node_data (str): The node object in JSON Canvas format

    Returns:
        str|None: The text returned or None if it cannot be found
    """

    if node_data["type"] == "text":
        return node_data["text"]
    
    if node_data["type"] == "link":
        return node_data["url"]
    
    if node_data["type"] == "file":
        _, file_extension = os.path.splitext(node_data["file"])
        if not file_extension[1:] in ["md","txt"]:
            return None
        # Warning suppressed as vault_path will be injected by the plugin
        path = os.path.join(vault_path, node_data["file"]) # type: ignore
        with open(path, "r") as file:
            return file.read()


    return None

def create_text_node(text: str, x: int, y: int, width: int = 250, height: int = 60):
    """Creates a text node in the canvas

    Args:
        text (str): The the text of the node
        x (int): The x coordinate of the node in the canvas
        y (int): The y coordinate of the node in the canvas
        width (int, optional): The width of the node. Defaults to 250.
        height (int, optional): The height of the node. Defaults to 60.
    """

    send_command(json.dumps({"command": "CREATE_TEXT_NODE", "text": text, "x": x, "y": y, "width": width, "height": height}))

def create_file_node(file: str, x: int, y: int, width: int = 400, height: int = 225):
    """Creates a file node in the canvas

    Args:
        file (str): The path to the file from the root directory of the Obsidian vault
        x (int): The x coordinate of the node in the canvas
        y (int): The y coordinate of the node in the canvas
        width (int, optional): The width of the node. Defaults to 400.
        height (int, optional): The height of the node. Defaults to 225.
    """

    send_command(json.dumps({"command": "CREATE_FILE_NODE", "file": file, "x": x, "y": y, "width": width, "height": height}))

def set_text_node_text(node_id: str, text: str):
    """Replaces the text of a text node

    Args:
        node_id (str): The ID of the node to replace
        text (str): New text
    """
    send_command(json.dumps({"command": "MODIFY_TEXT_NODE", "id": node_id, "text": text}))

def rebuild_canvas():
    """Causes the canvas to reload. Only required if set_text_node_text is called"""

    send_command(json.dumps({"command": "REBUILD_CANVAS"}))



# execution_type will be injected into the script
if execution_type == "simple": # type: ignore
    def get_parameter_file_path() -> str:
        """Gets the path of the file of a parameter node if the node type is file. Does not check type

        Returns:
            str: The absolute path of the file
        """

        # Warnings are suppressed as vault_path and parameter_data will be injected by the plugin
        return os.path.join(vault_path, parameter_data["file"])  # type: ignore

    def get_parameter_file(mode: str = "r") -> IO:
        """Helper function to get a file handler for the parameter file

        Args:
            read_type (str, optional): The mode which the file will be opened in. Defaults to "r".

        Returns:
            IO: File handler for the parameter file
        """
        return open(get_parameter_file_path(), mode)


# executionType will be injected into the script
elif execution_type == "workflow": # type: ignore

    def _return_output_data():
        """This function is for internal use only and should not be called by scripts.

        Returns the output data of a script in the workflow
        """

        # Alter output data to be serialisable
        for ioName, value in out_data.items(): # type: ignore
            ioType = script_settings["ioConnections"][ioName]["type"] # type: ignore
            newValue = value

            if ioType == "image":
                buffered = io.BytesIO()
                value.save(buffered, format="PNG")
                newValue = base64.b64encode(buffered.getvalue()).decode()

            out_data[ioName] = newValue # type: ignore

        send_command(json.dumps({"command": "RETURN_OUTPUT", "data": out_data})) # type: ignore