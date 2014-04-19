(function() {
  var BuyOrder, MarketHelper, OrderBook, SellOrder, async, exports, math;

  BuyOrder = GLOBAL.db.BuyOrder;

  SellOrder = GLOBAL.db.SellOrder;

  MarketHelper = require("./market_helper");

  async = require("async");

  math = require("mathjs")({
    number: "bignumber",
    decimals: 8
  });

  OrderBook = {
    findBuyOrdersToMatch: function(transaction, callback) {
      var orderToMatchQuery;
      if (callback == null) {
        callback = function() {};
      }
      orderToMatchQuery = {
        where: {
          status: {
            ne: MarketHelper.getOrderStatus("completed")
          }
        },
        order: [["unit_price", "DESC"], ["created_at", "ASC"]],
        attributes: ["id"]
      };
      return BuyOrder.findAll(orderToMatchQuery, {
        transaction: transaction
      }).complete(callback);
    },
    findMatchingSellOrders: function(buyOrderToMatch, transaction, callback) {
      var matchingOrdersQuery;
      if (callback == null) {
        callback = function() {};
      }
      matchingOrdersQuery = {
        where: {
          buy_currency: MarketHelper.getCurrency(buyOrderToMatch.sell_currency),
          sell_currency: MarketHelper.getCurrency(buyOrderToMatch.buy_currency),
          unit_price: {
            lte: buyOrderToMatch.unit_price
          },
          status: {
            ne: MarketHelper.getOrderStatus("completed")
          }
        },
        order: [["unit_price", "ASC"], ["created_at", "ASC"]]
      };
      return SellOrder.findAll(matchingOrdersQuery, {
        transaction: transaction
      }).complete(callback);
    },
    matchBuyOrders: function(callback) {
      if (callback == null) {
        callback = function() {};
      }
      return GLOBAL.db.sequelize.transaction(function(transaction) {
        return OrderBook.findBuyOrdersToMatch(transaction, function(err, buyOrders) {
          var matchOrderCallback;
          matchOrderCallback = function(o, cb) {
            return OrderBook.matchBuyOrderById(o.id, transaction, cb);
          };
          return async.mapSeries(buyOrders, matchOrderCallback, function(err, result) {
            if (err) {
              return transaction.rollback().success(function() {
                console.error(err);
                return callback(err);
              });
            }
            if (result) {
              return transaction.commit().success(function() {
                return callback(null, result);
              });
            }
            return callback();
          });
        });
      });
    },
    matchBuyOrderById: function(id, transaction, callback) {
      if (callback == null) {
        callback = function() {};
      }
      return BuyOrder.find(id, {
        transaction: transaction
      }).complete(function(err, buyOrderToMatch) {
        if (err) {
          return err;
        }
        return OrderBook.findMatchingSellOrders(buyOrderToMatch, transaction, function(err, matchingSellOrders) {
          var matchResults, updateOrderCallback;
          if (err) {
            return err;
          }
          if (!matchingSellOrders.length) {
            return callback(null, []);
          }
          matchResults = OrderBook.matchMultipleOrders(buyOrderToMatch, matchingSellOrders);
          updateOrderCallback = function(order, cb) {
            if (!order.changed()) {
              return cb(null, order);
            }
            return order.save({
              transaction: transaction
            }).complete(cb);
          };
          return async.each(matchingSellOrders.concat(buyOrderToMatch), updateOrderCallback, function(err, result) {
            if (err) {
              return callback("Could not match order " + buyOrderToMatch.id + " with " + matchingOrder.id + " - " + (JSON.stringify(err)));
            }
            return GLOBAL.db.Event.addMatchOrders(matchResults, transaction, function(err) {
              if (err) {
                return callback("Could not add event for matching order " + buyOrderToMatch.id + " - " + (JSON.stringify(err)));
              }
              return callback(null, matchResults);
            });
          });
        });
      });
    },
    matchMultipleOrders: function(buyOrderToMatch, matchingSellOrders) {
      var index, matchResult, matchResults, totalMatching;
      matchResults = [];
      totalMatching = matchingSellOrders.length;
      index = 0;
      while (buyOrderToMatch.left_amount > 0 && index < totalMatching) {
        matchResult = this.matchTwoOrders(buyOrderToMatch, matchingSellOrders[index]);
        matchResults.push(matchResult);
        index++;
      }
      return matchResults;
    },
    matchTwoOrders: function(orderToMatch, matchingOrder) {
      var amountToMatch, matchResult, unitPrice;
      amountToMatch = matchingOrder.left_amount > orderToMatch.left_amount ? orderToMatch.left_amount : matchingOrder.left_amount;
      unitPrice = matchingOrder.created_at < orderToMatch.created_at ? matchingOrder.unit_price : orderToMatch.unit_price;
      matchResult = [];
      matchResult.push(this.matchOrderAmount(orderToMatch, amountToMatch, unitPrice));
      matchResult.push(this.matchOrderAmount(matchingOrder, amountToMatch, unitPrice));
      return matchResult;
    },
    matchOrderAmount: function(order, amount, unitPrice) {
      var fee, result, resultAmount;
      resultAmount = this.calculateResultAmount(order, amount, unitPrice);
      fee = this.calculateFee(resultAmount);
      resultAmount = math.add(resultAmount, -fee);
      this.addMatchedAmount(order, amount);
      this.addResultAmount(order, resultAmount);
      this.addFee(order, fee);
      this.adjustStatusByAmounts(order);
      return result = {
        id: order.id,
        order_id: order.external_order_id,
        matched_amount: amount,
        result_amount: resultAmount,
        fee: fee,
        unit_price: unitPrice,
        status: order.status
      };
    },
    calculateResultAmount: function(order, amount, unitPrice) {
      if (order.action === "buy") {
        return amount;
      }
      unitPrice = MarketHelper.convertFromBigint(unitPrice);
      return math.multiply(amount, unitPrice);
    },
    calculateFee: function(amount) {
      return math.select(amount).divide(100).multiply(MarketHelper.getTradeFee()).done();
    },
    addMatchedAmount: function(order, amount) {
      return order.matched_amount = math.add(order.matched_amount, amount);
    },
    addResultAmount: function(order, amount) {
      return order.result_amount = math.add(order.result_amount, amount);
    },
    addFee: function(order, amount) {
      return order.fee = math.add(order.fee, amount);
    },
    adjustStatusByAmounts: function(order) {
      if (order.left_amount === 0) {
        return order.status = "completed";
      }
      if (order.matched_amount > 0 && order.matched_amount < order.amount) {
        return order.status = "partiallyCompleted";
      }
      if (order.matched_amount === 0) {
        return order.status = "open";
      }
    },
    addOrder: function(data, callback) {
      var actionObject;
      if (callback == null) {
        callback = function() {};
      }
      if (data.action === "buy") {
        actionObject = BuyOrder;
      }
      if (data.action === "sell") {
        actionObject = SellOrder;
      }
      if (!actionObject) {
        return callback("Wrong order action type " + data.action);
      }
      return actionObject.create(data).complete(callback);
    },
    deleteOpenOrder: function(externalId, callback) {
      var query;
      if (callback == null) {
        callback = function() {};
      }
      query = {
        where: {
          external_order_id: externalId,
          status: {
            ne: MarketHelper.getOrderStatus("completed")
          }
        }
      };
      return BuyOrder.find(query).complete(function(err, order) {
        if (err) {
          return callback(err);
        }
        if (order) {
          return order.destroy().complete(callback);
        }
        return SellOrder.find(query).complete(function(err, order) {
          if (err) {
            return callback(err);
          }
          if (order) {
            return order.destroy().complete(callback);
          }
          return callback("Could not delete order " + externalId + ". Might be already completed.");
        });
      });
    }
  };

  exports = module.exports = OrderBook;

}).call(this);
