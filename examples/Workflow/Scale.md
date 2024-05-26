```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

img = in_data["Image"]
width = in_data["Width"]
height = in_data["Height"]

if height is None:
    # Calculate height to maintain aspect ratio
    ratio = width / float(img.size[0])
    height = int(ratio * img.size[1])

# Resize the image
img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
out_data["Scaled"] = img_resized

```



```canvasblocksettings
{
	"ioConnections":
	{
		"Image": {
			"direction": "input",
			"type": "image"
		},

		"Width": {
			"direction": "input",
			"type": "integer"
		},

		"Height": {
			"direction": "input",
			"type": "integer"
		},
		
		"Scaled": {
			"direction": "output",
			"type": "image"
		}
	}
}
```