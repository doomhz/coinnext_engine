// Configure logger
if (process.env.NODE_ENV === "production") require("./configs/logger");

var fs = require('fs');
var environment = process.env.NODE_ENV || 'development';
var config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', encoding='utf8'))[environment];
var QUEUE_DELAY = 300;

// Configure globals
GLOBAL.appConfig = function () {return config;};
GLOBAL.db = require('./models/index');
GLOBAL.queue = require('./lib/queue/index');
var OrderBook = require("./lib/order_book")

var processEvents = function () {
  processNextCancellation(function () {
    processNextAdd(function () {
      processNextMatch(function () {
        setTimeout(processEvents, QUEUE_DELAY);
      });
    });
  });
};

var processNextCancellation = function (callback) {
  GLOBAL.queue.Event.findNext("cancel_order", function (err, event) {
    if (!event) return callback();
    var orderId = event.loadout.order_id;
    OrderBook.deleteOpenOrder(orderId, function (err) {
      if (!err) {
        event.status = "sent";
        event.save().complete(function (err) {
          if (err) {
            console.error("Could send event " + event.id, err);
            return callback();
          } else {
            GLOBAL.queue.Event.addOrderCanceled({order_id: orderId}, function (err) {
              if (err) {
                console.error("Could not add order_cancel for event " + event.id + " order " + orderId, err);
              }
              return callback();
            });
          }
        });
      } else {
        console.error("Could not process event " + event.id, err);
        return callback();
      }
    });
  });
};

var processNextAdd = function (callback) {
  GLOBAL.queue.Event.findNext("add_order", function (err, event) {
    if (!event) return callback();
    var data = event.loadout;
    OrderBook.addOrder(data, function (err, order) {
      if (!err) {
        event.status = "sent";
        event.save().complete(function (err) {
          if (err) {
            console.error("Could send event " + event.id, err);
            return callback();
          } else {
            GLOBAL.queue.Event.addOrderAdded({order_id: order.external_order_id}, function (err) {
              if (err) {
                console.error("Could not add order_added for event " + event.id + " order " + order.id, err);
              }
              return callback();
            });
          }
        });
      } else {
        console.error("Could not process event " + event.id, err);
        return callback();
      }
    });
  });
};

var processNextMatch = function (callback) {
  OrderBook.matchBuyOrders(callback);
};

processEvents();

console.log("processing events...");