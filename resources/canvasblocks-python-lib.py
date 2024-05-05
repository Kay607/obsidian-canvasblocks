import json
import importlib
import subprocess
import os
from typing import IO

# Replace the default python print function with one which will call console.log in the obisidan console
send_command = print
print = None
def print(*args):
	send_command(json.dumps({"command": "PRINT", "text": ' '.join(map(str, args))}))

def InstallDependency(module: str, import_name: str = None):
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
        output = subprocess.check_output(['pip', 'install', module], stderr=subprocess.STDOUT)
        print(output)

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

def rebuild_canvas():
    """Causes the canvas to reload. Only required if set_text_node_text is called"""

    send_command(json.dumps({"command": "REBUILD_CANVAS"}))