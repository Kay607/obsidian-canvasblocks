# 🔒 Hash
```canvasblocksettings
{
	"type": "simple"
}
```

```pycanvasblock
hash_functions_supported = "md5|sha1|sha224|sha256|sha384|sha512"

isFile = False
match parameter_data["type"]:
	case "file":
		isFile = True
		
	case "link":
		data = parameter_data["url"]

	case "text":
		data = parameter_data["text"]

import hashlib

BUF_SIZE = 65536  # Read in 64kb chunks


if len(arrow_parameters) > 0:
	hash_function = arrow_parameters[0]["text"]
else:
	notice(f"Add an arrow parameter (${hash_functions_supported})")
	exit()

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
	with open(get_parameter_file_path(), 'rb') as f:
		while True:
			data = f.read(BUF_SIZE)
			if not data:
				break
			hash.update(data)

else:
	hash.update(data.encode('utf-8'))


hash_hex = hash.hexdigest()
create_text_node(hash_hex, script_data["x"], script_data["y"]+script_data["height"]+20)
```
