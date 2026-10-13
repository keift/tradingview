const WebSocket = require("ws");

// TradingView mesajlarını formatlama fonksiyonu
// TradingView WebSocket'i `~m~[uzunluk]~m~[mesaj]` formatını kullanır.
function formatMessage(packet) {
  const msg = typeof packet === "object" ? JSON.stringify(packet) : packet;
  return `~m~${msg.length}~m~${msg}`;
}

// Gelen TradingView mesajlarını ayrıştırma fonksiyonu
function parseMessages(str) {
  const cleanerRgx = /~h~/g;
  const splitterRgx = /~m~[0-9]{1,}~m~/g;

  return str
    .replace(cleanerRgx, "")
    .split(splitterRgx)
    .map((p) => {
      if (!p) return false;
      try {
        return JSON.parse(p);
      } catch (e) {
        return p;
      }
    })
    .filter((p) => p !== false);
}

// TradingView WebSocket sunucusuna bağlanıyoruz
const ws = new WebSocket(
  "wss://data.tradingview.com/socket.io/websocket?from=chart&type=chart",
  {
    headers: {
      Origin: "https://www.tradingview.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    },
  },
);

// Benzersiz bir oturum kimliği (session ID) oluşturuyoruz
const sessionId = "cs_" + Math.random().toString(36).substring(2, 12);
const parite = "BINANCE:BTCUSDT"; // Çekmek istediğimiz parite
const zamanDilimi = "1"; // 1 dakikalık mumlar (1, 5, 15, 60, 'D', 'W', 'M')

ws.on("open", () => {
  console.log("TradingView WebSocket bağlantısı kuruldu!");

  // 1. Adım: Yetkilendirme (Kayıtsız kullanıcı)
  ws.send(
    formatMessage({ m: "set_auth_token", p: ["unauthorized_user_token"] }),
  );

  // 2. Adım: Chart (Grafik) oturumu oluşturma
  ws.send(formatMessage({ m: "chart_create_session", p: [sessionId] }));

  // 3. Adım: Pariteyi çözme (Symbol Resolution)
  ws.send(
    formatMessage({
      m: "resolve_symbol",
      p: [sessionId, "ser_1", `={"symbol":"${parite}","adjustment":"splits"}`],
    }),
  );

  // 4. Adım: Serileri (mumları) isteme
  // 100: Geriye dönük kaç mum çekileceği
  ws.send(
    formatMessage({
      m: "create_series",
      p: [sessionId, "$prices", "s1", "ser_1", zamanDilimi, 100],
    }),
  );
});

ws.on("message", (data) => {
  const str = data.toString();

  // TradingView düzenli olarak Ping gönderir (~h~[sayı]), bağlantının kopmaması için aynı mesajı geri göndermeliyiz (Pong)
  if (str.includes("~h~")) {
    const match = str.match(/~m~\d+~m~~h~(\d+)/);
    if (match) {
      ws.send(formatMessage(`~h~${match[1]}`));
    }
  }

  const packets = parseMessages(str);

  packets.forEach((packet) => {
    if (typeof packet === "object") {
      // Mum verileri genellikle 'qdata', 'du' (data update) veya 'timescale_update' paketlerinde gelir
      if (
        packet.m === "qdata" ||
        packet.m === "du" ||
        packet.m === "timescale_update"
      ) {
        if (packet.p[1] && packet.p[1].$prices && packet.p[1].$prices.s) {
          const prices = packet.p[1].$prices.s;

          prices.forEach((candle) => {
            // candle.v = [Zaman Damgası, Açılış, En Yüksek, En Düşük, Kapanış, Hacim]
            const [time, open, high, low, close, volume] = candle.v;
            const date = new Date(time * 1000).toLocaleString("tr-TR"); // Unix zamanı saniye cinsinden olduğu için 1000 ile çarpıyoruz

            console.log(
              `[${date}] ${parite} | Açılış: ${open} | Yüksek: ${high} | Düşük: ${low} | Kapanış: ${close} | Hacim: ${volume}`,
            );
            console.log("evet")
          });
        }
      }
    }
  });
});

ws.on("close", () => {
  console.log("Bağlantı kapandı.");
});

ws.on("error", (err) => {
  console.error("WebSocket Hatası:", err);
});
