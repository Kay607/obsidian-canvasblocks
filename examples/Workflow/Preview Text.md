```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"Text": {
			"direction": "input",
			"type": "text"
		}
	}
}
```

```pycanvasblock
text = in_data["Text"]

create_text_node(text, script_data["x"], script_data["y"]+script_data["height"]+120)
```