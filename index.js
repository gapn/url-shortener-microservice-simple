require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb');
const urlparser = require('url');
const dns = require('dns');

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('urlshortener');
const urls = db.collection('urls');

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => res.sendFile(process.cwd() + '/views/index.html'));

app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  const hostname = urlparser.parse(originalUrl).hostname;

  if (!hostname) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, async (err, address) => {
    if (!address) {
      return res.json({ error: 'invalid url' });
    }

    const urlCount = await urls.countDocuments({});
    const urlDoc = {
      url: originalUrl,
      short_url: urlCount + 1 // Start at 1 instead of 0
    };

    await urls.insertOne(urlDoc);
    res.json({ original_url: originalUrl, short_url: urlCount + 1 });
  });
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const shorturl = req.params.short_url;
  const urlDoc = await urls.findOne({ short_url: +shorturl });
  
  if (urlDoc) {
    // Standard 302 redirect
    return res.redirect(urlDoc.url);
  } else {
    return res.json({ error: "No short URL found" });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));