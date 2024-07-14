# 🎨 Grayscale 
```canvasblocksettings
{
	"type": "simple"
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

img = Image.open(get_parameter_file_path()).convert('L')
  
name, ext = os.path.splitext(parameter_data["file"])
name = os.path.basename(name)

grayscale_file_name = f"{name}_Gray{ext}"
grayscale_file_path = os.path.join(plugin_folder, grayscale_file_name)

grayscale_absolute_path = os.path.join(vault_path, grayscale_file_path)

img.save(grayscale_absolute_path)

create_file_node(grayscale_file_path, script_data["x"], script_data["y"]+script_data["height"]+20, parameter_data["width"], parameter_data["height"])
```
