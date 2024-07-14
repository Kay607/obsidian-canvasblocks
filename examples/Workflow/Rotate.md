```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"Image": {
			"direction": "input",
			"type": "image"
		},
		
		"Angle": {
			"direction": "input",
			"type": "float"
		},

		"Rotated": {
			"direction": "output",
			"type": "image"
		}
	}
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

if "Angle" in in_data:
    rotate_angle = in_data["Angle"]
else:
    rotate_angle = 90

img = in_data["Image"]

# Calculate the size of the bounding box after rotation
rotated_bbox = img.rotate(-rotate_angle, expand=True).getbbox()
new_size = (rotated_bbox[2], rotated_bbox[3])

# Create a new transparent image
img_rotated = Image.new("RGBA", new_size, (0, 0, 0, 0))

# Paste the rotated image onto the transparent image
img_rotated.paste(img.rotate(-rotate_angle, expand=True), (0, 0))

out_data["Rotated"] = img_rotated
```