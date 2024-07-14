# 📷 OCR
```canvasblocksettings
{
	"type": "simple"
}
```

```pycanvasblock
install_dependency("pillow", "PIL")
install_dependency("pytesseract")
from PIL import Image
import pytesseract
import io

img = Image.open(get_parameter_file_path())
img = img.convert("RGB")

text = pytesseract.image_to_string(img, lang='eng')

create_text_node(text, script_data["x"], script_data["y"]+script_data["height"]+20)
```
