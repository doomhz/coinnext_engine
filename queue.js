// Configure logger
if (process.env.NODE_ENV === "production") require("./configs/logger");

var fs = require('fs');
var environment = process.env.NODE_ENV || 'development';
var config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', encoding='utf8'))[environment];

// Configure globals
GLOBAL.appConfig = function () {return config;};
GLOBAL.db = require('./models/index');

var processEvents = function () {
  GLOBAL.db.Event.sendNext(function () {
    setTimeout(processEvents, 500);
  });
}

processEvents();

console.log("processing events...");