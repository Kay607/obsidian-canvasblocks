# 🔄 Resize
```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image
import os

def resize_image(input_file, output_file, width, height=None):
    img = Image.open(input_file)

    if height is None:
        # Calculate height to maintain aspect ratio
        ratio = width / float(img.size[0])
        height = int(ratio * img.size[1])

    # Resize the image
    img_resized = img.resize((width, height), Image.ANTIALIAS)

    # Save the resized image
    img_resized.save(output_file)

    return output_file

if len(arrow_parameters) == 0:
    exit()

arrow_parameter = arrow_parameters[0]["text"]
if "," in arrow_parameter:
    width, height, *_ = [int(a) for a in arrow_parameter.split(",")]
else:
    width = int(arrow_parameter)
    height = None

input_file_path = get_parameter_file_path()

name, ext = os.path.splitext(parameter_data["file"])
name = os.path.basename(name)


scaled_file_name = f"{name}_Resized_{width}-{height}{ext}"
scaled_file_path = os.path.join(plugin_folder, scaled_file_name)

scaled_absolute_path = os.path.join(vault_path, scaled_file_path)
resize_image(input_file_path, scaled_absolute_path, width, height)

create_file_node(scaled_file_path, script_data["x"], script_data["y"]+script_data["height"]+20, parameter_data["width"], parameter_data["width"])
```
