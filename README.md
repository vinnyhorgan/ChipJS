# ChipJS
The emulator is based on the design presented in [this](https://www.freecodecamp.org/news/creating-your-very-own-chip-8-emulator/) article from freeCodeCamp.

ChipJS makes adding a Chip-8 emulator to your web page really easy:

#### index.html
```
<!DOCTYPE html>
<html>
  <head>
    <title>ChipJS</title>
  </head>
  <body>
    <canvas></canvas>

    <script src="chip.js"></script>
    <script src="index.js"></script>
  </body>
</html>
```

#### index.js
```
const chip = new ChipJS("YOUR ROM NAME GOES HERE");
```

#### Adding ROMs
To add roms to the emulator simply create a roms folder and put your roms there, then substitute the rom name in the example with the name of the rom you want (the roms folder will be automatically referenced).

You can get Chip-8 ROMs from [this](https://github.com/dmatlack/chip8/tree/master/roms) GitHub repository.
