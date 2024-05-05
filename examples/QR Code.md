# 📱 QR Code
```pycanvasblock
import os, random, string

install_dependency("qrcode")
import qrcode

data = get_text_from_node(parameter_data)

if data == None or len(data) > 2331:
    exit()

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=4,
)
qr.add_data(data)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")

name = ''.join(random.choice(string.ascii_lowercase) for _ in range(6))

qr_name = f"QR_{name}.png"
qr_file =  os.path.join(plugin_folder, qr_name)
qr_file_absolute = os.path.join(vault_path, qr_file)

img.save(qr_file_absolute)

create_file_node(qr_file, script_data["x"], script_data["y"]+script_data["height"]+20)
```
