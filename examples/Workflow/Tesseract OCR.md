```pycanvasblock
install_dependency("pillow", "PIL")
install_dependency("pytesseract")
from PIL import Image
import pytesseract

img = in_data["Image"].convert("RGB")

text = pytesseract.image_to_string(img, lang='eng')
out_data["OCR Text"] = text
```


```canvasblocksettings
{
	"ioConnections":
	{
		"Image": {
			"direction": "input",
			"type": "image"
		},
		
		"OCR Text": {
			"direction": "output",
			"type": "text"
		}
	}
}
```
