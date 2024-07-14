# 📷 QR Code Scanner
```canvasblocksettings
{
	"type": "simple"
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
install_dependency("pyzbar")
from PIL import Image
from pyzbar.pyzbar import decode

img = Image.open(get_parameter_file_path())

# Convert the image to grayscale
img_gray = img.convert('L')

# Decode the QR code
qr_code_data = decode(img_gray)

# Check if QR code is detected
if qr_code_data:
    # Extract the decoded text from the QR code
    qr_text = qr_code_data[0].data.decode('utf-8')
    create_text_node(qr_text, script_data["x"], script_data["y"]+script_data["height"]+20)
else:
    print("No QR Code detected.")
```
