# 🔄 Rotate
```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image
import os

rotate_angle = 90
if len(arrow_parameters) > 0:
    arrow_parameter = arrow_parameters[0]["text"]
    try:
        num = int(arrow_parameter)
        rotate_angle = num
    except ValueError:
        pass

img = Image.open(get_parameter_file_path())
img_rotated = img.rotate(-rotate_angle)

name, ext = os.path.splitext(parameter_data["file"])
name = os.path.basename(name)


rotated_file_name = f"{name}_Rotated_{rotate_angle}{ext}"
rotated_file_path = os.path.join(plugin_folder, rotated_file_name)

rotated_absolute_path = os.path.join(vault_path, rotated_file_path)
img_rotated.save(rotated_absolute_path)

create_file_node(rotated_file_path, script_data["x"], script_data["y"]+script_data["height"]+20, parameter_data["width"], parameter_data["width"])
```
