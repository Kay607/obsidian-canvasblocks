```pycanvasblock
import os, random, string

install_dependency("qrcode")
import qrcode

data = in_data["Text"]

if data == None or len(data) > 2331:
    notice("Input data too large for QR code")

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=4,
)
qr.add_data(data)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")

out_data["QR Code"] = img
```



```canvasblocksettings
{
	"ioConnections":
	{
		"Text": {
			"direction": "input",
			"type": "text"
		},
		
		"QR Code": {
			"direction": "output",
			"type": "image"
		}
	}
}
```