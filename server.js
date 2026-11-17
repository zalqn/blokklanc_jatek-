// Blokklánc-játék szerver: kiszolgálja a játékot és a valódi kripto-árfolyamot (/api/prices), függőség nélkül.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3100, PUB = path.join(__dirname, 'public');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'};
let cache = null, cacheAt = 0;

async function prices() {
  if (cache && Date.now() - cacheAt < 15000) return cache;
  try { // CoinGecko, tartalék: Binance
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple&vs_currencies=usd&include_24hr_change=true');
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(), m = {BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple'}, o = {t: Date.now(), src: 'coingecko'};
    for (const s in m) o[s] = {usd: j[m[s]].usd, ch24: j[m[s]].usd_24h_change};
    cache = o;
  } catch (e) {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent('["BTCUSDT","ETHUSDT","XRPUSDT"]'));
    const a = await r.json(), o = {t: Date.now(), src: 'binance'};
    for (const x of a) o[x.symbol.replace('USDT', '')] = {usd: +x.lastPrice, ch24: +x.priceChangePercent};
    cache = o;
  }
  cacheAt = Date.now();
  return cache;
}

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/prices') {
    try { const p = await prices(); res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store'}); return res.end(JSON.stringify(p)); }
    catch (e) { res.writeHead(502, {'Access-Control-Allow-Origin': '*'}); return res.end('{"error":"no price"}'); }
  }
  const f = path.join(PUB, url === '/' ? 'index.html' : decodeURIComponent(url));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, d) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}); res.end(d);
  });
}).listen(PORT, () => console.log('Blokklánc-játék: http://localhost:' + PORT));
