# 🌈 Image to Any
```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image
import os

ext = arrow_parameters[0]["text"]

img = Image.open(get_parameter_file_path())

name, _ = os.path.splitext(parameter_data["file"])
name = os.path.basename(name)


output_file_name = f"{name}.{ext}"
output_file_path = os.path.join(plugin_folder, output_file_name)

output_absolute_path = os.path.join(vault_path, output_file_path)
img.save(output_absolute_path)

create_file_node(output_file_path, script_data["x"], script_data["y"]+script_data["height"]+20, script_data["width"], script_data["height"])
```
