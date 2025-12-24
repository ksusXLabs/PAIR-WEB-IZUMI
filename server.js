const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/pair", async (req, res) => {
  try {
    const number = req.body.number;
    if (!number || !number.startsWith("94")) {
      return res.json({ ok: false, msg: "Invalid number format (94XXXXXXXXX)" });
    }

    const authPath = path.join(__dirname, "auth", number);
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.macOS("Chrome")
    });

    sock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered) {
      const code = await sock.requestPairingCode(number);
      return res.json({
        ok: true,
        code: code,
        note: "WhatsApp → Linked Devices → Link with phone number"
      });
    } else {
      return res.json({
        ok: true,
        code: "ALREADY PAIRED"
      });
    }

  } catch (err) {
    console.error(err);
    res.json({ ok: false, msg: "Pairing failed. Try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("IZUMI LITE Pairing Server running on port", PORT);
});

