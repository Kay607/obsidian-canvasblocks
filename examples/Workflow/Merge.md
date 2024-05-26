```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image
import os

img1 = in_data["Image Left"]
img2 = in_data["Image Right"]

width1, height1 = img1.size
width2, height2 = img2.size

# Get the aspect ratios of the original images
aspect_ratio1 = img1.width / img1.height
aspect_ratio2 = img2.width / img2.height

# Scale the image with the larger aspect ratio to fit the dimension of the other image while maintaining aspect ratio
if aspect_ratio1 < aspect_ratio2:
    # Scale img1 to fit img2's height
    new_width = int(height2 * aspect_ratio1)
    img1 = img1.resize((new_width, height2), Image.Resampling.LANCZOS)
else:
    # Scale img2 to fit img1's height
    new_width = int(height1 * aspect_ratio2)
    img2 = img2.resize((new_width, height1), Image.Resampling.LANCZOS)

# Correct the dimensions to the scaled ones
width1, height1 = img1.size
width2, height2 = img2.size

# Find the greatest height of the 2 images
max_height = max(height1, height2)

# Create an empty image with the combined width and the maximum height
merged_image = Image.new('RGB', (width1 + width2, max_height))

# Add the 2 images to the correct locations
merged_image.paste(img1, (0, 0))
merged_image.paste(img2, (width1, 0))

out_data["Merged"] = merged_image
```



```canvasblocksettings
{
	"ioConnections":
	{
		"Image Left": {
			"direction": "input",
			"type": "image"
		},
		
		"Image Right": {
			"direction": "input",
			"type": "image"
		},

		"Merged": {
			"direction": "output",
			"type": "image"
		}
	}
}
```