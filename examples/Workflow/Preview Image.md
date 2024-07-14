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
import base64, io

img = in_data["Image"]

# Convert the image to bytes
img_byte_array = io.BytesIO()
img.save(img_byte_array, format=img.format)
img_byte_array = img_byte_array.getvalue()

# Convert the bytes to base64
base64_str = base64.b64encode(img_byte_array).decode('utf-8')

# Create HTML image tag
html_img_tag = f'<img src="data:image/png;base64,{base64_str}" alt="Image">'


create_text_node(html_img_tag, script_data["x"], script_data["y"]+script_data["height"]+120, 400, 400)
```
