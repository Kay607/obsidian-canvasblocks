```pycanvasblock
install_dependency("pillow", "PIL")
from PIL import Image

install_dependency("requests")
import requests
from io import BytesIO

url = in_data["URL"]
response = requests.get(url)
img = Image.open(BytesIO(response.content))

out_data["Image"] = img
```

```canvasblocksettings
{
	"ioConnections": {
		"URL": {
			"direction": "input",
			"type": "text"
		},
		
		"Image": {
			"direction": "output",
			"type": "image"
		}
	}
}
```