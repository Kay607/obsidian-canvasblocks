```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"Image": {
			"direction": "input",
			"type": "image"
		}
	}
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

import os, random, string

name = ''.join(random.choice(string.ascii_lowercase) for _ in range(6))
image_name = f"Save_{name}.png"
image_file =  os.path.join(plugin_folder, image_name)
image_file_absolute = os.path.join(vault_path, image_file)

in_data["Image"].save(image_file_absolute)

create_file_node(image_file, script_data["x"], script_data["y"]+script_data["height"]+120)
```