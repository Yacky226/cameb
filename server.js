const express = require("express");
const multer = require("multer");
const Jimp = require("jimp");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    // Load base event image
    const eventImage = await Jimp.read(
      path.join(__dirname, "public", "event.jpg")
    );

    // Load user upload from buffer
    const userImg = await Jimp.read(req.file.buffer);

    // Redimensionner sans déformer, puis centrer dans un carré 100x100
    userImg.cover(
      100,
      100,
      Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
    );

    // Appliquer un masque circulaire pour ne garder que le rond
    const mask = new Jimp(100, 100, 0x00000000);
    mask.scan(0, 0, 100, 100, function (x, y, idx) {
      const dx = x - 50,
        dy = y - 50;
      if (dx * dx + dy * dy <= 50 * 50) this.bitmap.data[idx + 3] = 255;
    });
    userImg.mask(mask, 0, 0);

    // Composite user image onto event image at (50,50)
    eventImage.composite(userImg, 50, 50);

    // Load font and add text (décommenter si besoin)

    // Get the combined image buffer
    const buffer = await eventImage.getBufferAsync(Jimp.MIME_JPEG);

    // Send image as base64 URL for preview
    res.json({
      image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Processing error");
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
