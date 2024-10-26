```canvasblocksettings
{
	"type": "workflow",
	"ioConnections":
	{
		"Data": {
			"direction": "input",
			"type": "file"
		},
		
		"Function": {
			"direction": "input",
			"type": "text"
		},

		"Hash": {
			"direction": "output",
			"type": "text"
		}
	}
}
```

```pycanvasblock
hash_functions_supported = "md5|sha1|sha224|sha256|sha384|sha512"

import os
import json
import hashlib

isFile = False

#node = json.loads(in_data["Data"])
node = in_data["Data"]

if node["type"] == "file":
	isFile = True

if node["type"] == "text":
	data = node["text"]
elif node["type"] == "link":
	data = node["url"]



BUF_SIZE = 65536  # Read in 64kb chunks


hash_function = in_data["Function"]

hash_function = hash_function.lower().replace(" ", "").replace("-", "")

if hash_function == "md5":
	hash = hashlib.md5()
elif hash_function == "sha1":
	hash = hashlib.sha1()
elif hash_function == "sha224":
	hash = hashlib.sha224()
elif hash_function == "sha256":
	hash = hashlib.sha256()
elif hash_function == "sha384":
	hash = hashlib.sha384()
elif hash_function == "sha512":
	hash = hashlib.sha512()
else:
	notice(f"Hash function must be one of (${hash_functions_supported})")
	exit()

if isFile:
	with open(os.path.join(vault_path, node["file"]), 'rb') as f:
		while True:
			data = f.read(BUF_SIZE)
			if not data:
				break
			hash.update(data)

else:
	hash.update(data.encode('utf-8'))


hash_hex = hash.hexdigest()

out_data["Hash"] = hash_hex
```
