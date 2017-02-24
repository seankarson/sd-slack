const express = require('express');
const app = express();

const request = require('request');

const URL = 'https://translate1.spanishdict.com/api/v1/wordoftheday';

app.get('/wordoftheday', function (req, res) {
  request(URL, function(error, response, body) {
    const data = JSON.parse(body).data;

    const slackResponse = {
      text: data.word,
      attachments: [
        {
          text: data.translation
        }
      ]
    };
    res.json(slackResponse);
  });
});

app.listen(3000);
