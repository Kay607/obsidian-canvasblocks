```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"Image": {
			"direction": "input",
			"type": "image"
		},
		
		"Grayscale": {
			"direction": "output",
			"type": "image"
		}
	}
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

img = in_data["Image"]
grayscale = img.convert('L')
out_data["Grayscale"] = grayscale
```
