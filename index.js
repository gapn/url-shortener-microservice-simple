require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const urlParser = require('url');

mongoose.connect(process.env.MONGODB_URI)

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

mongoose.connection.on('connected', () => {
  console.log('Mongoose is connected to the cluster!');
});

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

//routes
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//POST route
app.post('/api/shorturl', async(req, res) => {
  const originalUrl = req.body.url;

  try {
    const urlObject = new URL(originalUrl);

    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    dns.lookup(urlObject.hostname, async (err) => {
      if (err) {
        res.json({ error: 'invalid url' });
      } else {
        // Check if it exists in DB already
        let foundUrl = await Url.findOne({ original_url: originalUrl });

        if (foundUrl) {
          res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
        } else {
          // Get count to create the next short_url ID
          const count = await Url.countDocuments();
          const newUrl = new Url({
            original_url: originalUrl,
            short_url: count + 1
          });
          await newUrl.save();
          res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
        }
      }
    })
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

//GET route
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shorturl = req.params.short_url;
  const foundUrl = await Url.findOne({ short_url: Number(shorturl) });

  if (foundUrl) {
    return res.redirect(foundUrl.original_url);
  } else {
    return res.json({ error: "No short URL found for your input" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});