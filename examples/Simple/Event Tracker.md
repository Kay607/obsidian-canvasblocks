# ⏰ Event Tracker
```canvasblocksettings
{
	"type": "simple"
}
```

```pycanvasblock
from datetime import datetime

prefix = "Last ran: "

# YYYY-MM-DD format
date_format = "%Y-%m-%d"

delimiter = "|`|`|`".replace("|", "")

node_text = script_data["text"]

parts = node_text.split(delimiter, 4)
if len(parts) > 4:
	script_text = delimiter.join(parts[:4]) + delimiter
else:
	script_text = node_text

date_string = datetime.now().strftime(date_format)
set_text_node_text(script_data["id"], script_text + "\n" + prefix + date_string)
```
