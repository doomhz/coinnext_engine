// Configure logger
if (process.env.NODE_ENV === "production") require("./configs/logger");

var fs = require('fs');
var environment = process.env.NODE_ENV || 'development';
var config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', encoding='utf8'))[environment];

// Configure globals
GLOBAL.appConfig = function () {return config;};
GLOBAL.db = require('./models/index');
GLOBAL.queue = require('./lib/queue/index');
var OrderBook = require("./lib/order_book")

var processOrders = function () {
  OrderBook.matchBuyOrders(function () {
    setTimeout(processOrders, 100);
  });
};

processOrders();

console.log("processing orders...");