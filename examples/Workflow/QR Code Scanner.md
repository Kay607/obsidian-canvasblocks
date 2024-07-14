```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"QR Code": {
			"direction": "input",
			"type": "image"
		},
		
		"Text": {
			"direction": "output",
			"type": "text"
		}
	}
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
install_dependency("pyzbar")
from PIL import Image
from pyzbar.pyzbar import decode

img = in_data["QR Code"]

# Convert the image to grayscale
img_gray = img.convert('L')

# Decode the QR code
qr_code_data = decode(img_gray)

# Check if QR code is detected
if qr_code_data:
    # Extract the decoded text from the QR code
    qr_text = qr_code_data[0].data.decode('utf-8')
    out_data["Text"] = qr_text
else:
    raise Exception("No QR code found")
```
