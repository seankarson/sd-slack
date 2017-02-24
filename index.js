'use strict';

const express = require('express');
const app = express();

const request = require('request');

const WOTD_URL = 'https://translate1.spanishdict.com/api/v1/wordoftheday';
const DICTIONARY_URL = 'https://translate1.spanishdict.com/api/v1/dictionary';

app.get('/', function (req, res) {
  res.status(200).send('OK');
});

function badCommand(res) {
  const slackResponse = {
    response_type: "in_channel",
    text: "Your <http://www.spanishdict.com|SpanishDict> command was not formatted correctly.",
    attachments: [
      {
        text: 'Try one of these commands:\n- `/spanishdict translate [word]`\n- `/spanishdict wordoftheday`',
        color: '#3E86C7',
        mrkdwn_in: ["text"]
      }
    ]
  };
  res.json(slackResponse);
}

function wordNotFound(res) {
  const slackResponse = {
    response_type: "in_channel",
    text: "We couldn't find the word you were looking for on <http://www.spanishdict.com|SpanishDict>.",
    attachments: [
      {
        text: 'A few suggestions:\n- Check your spelling.\n- Try searching for similar words.',
        color: '#3E86C7',
        mrkdwn_in: ["text"]
      }
    ]
  };
  res.json(slackResponse);
}

function wordOfTheDay(res) {
  request(WOTD_URL, function(error, response, body) {
    const data = JSON.parse(body).data;

    const slackResponse = {
      response_type: "in_channel",
      text: "Today's word of the day is:",
      attachments: [
        {
          title: data.word,
          title_link: `http://www.spanishdict.com/translate/${data.word}`,
          text: `${data.translation}\n_${data.pronunciation}_\n\n*Examples*\n${data.example1Es}\n_${data.example1En}_\n\n${data.example2Es}\n_${data.example2En}_\n<http://www.spanishdict.com/examples/${data.word}|See more examples>`,
          color: '#3E86C7',
          mrkdwn_in: ["text"]
        }
      ]
    };
    res.json(slackResponse);
  });
}

function translateSlackResponse(res, source, neodict, lang) {
  const sense = neodict.senses[0];
  const translation = sense.translations[0];
  const definition = translation.translation;
  const example = translation.examples[0];

  let exampleCurrentLang = example.textEn;
  let exampleAlternateLang = example.textEs;
  if (lang === 'es') {
    exampleCurrentLang = example.textEs;
    exampleAlternateLang = example.textEn;
  }

  const slackResponse = {
    response_type: "in_channel",
    text: "Your translation from <http://www.spanishdict.com|SpanishDict>:",
    attachments: [
      {
        title: source,
        title_link: `http://www.spanishdict.com/translate/${source}`,
        text: `${definition}\n\n*Example Sentence*\n${exampleCurrentLang}\n_${exampleAlternateLang}_\n<http://www.spanishdict.com/examples/${source}|See more examples>`,
        color: '#3E86C7',
        mrkdwn_in: ["text"]
      }
    ]
  };
  res.json(slackResponse);
}

function translate(res, word) {
  request(`${DICTIONARY_URL}?q=${word}&source=es`, function(esError, esResponse, esBody) {
    const esData = JSON.parse(esBody).data;
    if (esData && esData.neodict) {
      const neodict = JSON.parse(esData.neodict);
      if (neodict) {
        translateSlackResponse(res, esData.source, neodict, 'es');
      }
    } else {
      request(`${DICTIONARY_URL}?q=${word}&source=en`, function(enError, enResponse, enBody) {
        const enData = JSON.parse(enBody).data;
        if (enData && enData.neodict) {
          const neodict = JSON.parse(enData.neodict);
          if (neodict) {
            translateSlackResponse(res, enData.source, neodict, 'en')
          } else {
            wordNotFound(res);
          }
        } else {
          wordNotFound(res);
        }
      });
    }
  });
}

app.get('/slack', function (req, res) {
  const text = req.query.text;

  if (!text) {
    badCommand(res);
  } else if (text === 'wordoftheday') {
    wordOfTheDay(res);
  } else {
    let splitText = text.split(' ');
    if (splitText.length >= 2 && splitText[0] === 'translate') {
      splitText.shift();
      const word = splitText.join(' ');
      if (word) {
        translate(res, word);
      } else {
        badCommand(res);
      }
    } else {
      badCommand(res);
    }
  }
});

app.listen(3000);
