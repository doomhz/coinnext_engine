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
    findNext: function(callback) {
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
        order: [["created_at", "ASC"]]
      };
      return BuyOrder.find(orderToMatchQuery).complete(callback);
    },
    findMatchingOrder: function(orderToMatch, callback) {
      var matchingOrdersQuery;
      if (callback == null) {
        callback = function() {};
      }
      matchingOrdersQuery = {
        where: {
          buy_currency: MarketHelper.getCurrency(orderToMatch.sell_currency),
          sell_currency: MarketHelper.getCurrency(orderToMatch.buy_currency),
          status: {
            ne: MarketHelper.getOrderStatus("completed")
          }
        },
        order: [["created_at", "ASC"]]
      };
      if (orderToMatch.action === "buy") {
        matchingOrdersQuery.where.unit_price = {
          lte: orderToMatch.unit_price
        };
      }
      if (orderToMatch.action === "sell") {
        matchingOrdersQuery.where.unit_price = {
          gte: orderToMatch.unit_price
        };
      }
      return SellOrder.find(matchingOrdersQuery).complete(callback);
    },
    matchFirstOrder: function(callback) {
      if (callback == null) {
        callback = function() {};
      }
      return OrderBook.findNext(function(err, orderToMatch) {
        if (err) {
          return err;
        }
        if (!orderToMatch) {
          return callback();
        }
        return OrderBook.findMatchingOrder(orderToMatch, function(err, matchingOrder) {
          if (!matchingOrder) {
            return callback();
          }
          return GLOBAL.db.sequelize.transaction(function(transaction) {
            var matchResult, updateOrderCallback;
            matchResult = OrderBook.matchOrders(orderToMatch, matchingOrder);
            updateOrderCallback = function(order, cb) {
              return order.save({
                transaction: transaction
              }).complete(cb);
            };
            return async.each([orderToMatch, matchingOrder], updateOrderCallback, function(err, result) {
              if (err) {
                console.error("Could not match order " + orderToMatch.id + " with " + matchingOrder.id + " - " + (JSON.stringify(err)));
                return transaction.rollback().success(function() {
                  return callback(err);
                });
              }
              return GLOBAL.db.Event.add("orders_match", matchResult, transaction, function(err) {
                if (err) {
                  console.error("Could not add event for matching order " + orderToMatch.id + " with " + matchingOrder.id + " - " + (JSON.stringify(err)));
                  return transaction.rollback().success(function() {
                    return callback(err);
                  });
                }
                return transaction.commit().success(function() {
                  return callback(null, matchResult);
                });
              });
            });
          });
        });
      });
    },
    matchOrders: function(orderToMatch, matchingOrder) {
      var amountToMatch, matchResult;
      amountToMatch = matchingOrder.left_amount > orderToMatch.left_amount ? orderToMatch.left_amount : matchingOrder.left_amount;
      matchResult = [];
      matchResult.push(this.matchOrderAmount(orderToMatch, amountToMatch, matchingOrder.unit_price));
      matchResult.push(this.matchOrderAmount(matchingOrder, amountToMatch, matchingOrder.unit_price));
      return matchResult;
    },
    matchOrderAmount: function(order, amount, unitPrice) {
      var fee, result, resultAmount;
      resultAmount = this.calculateResultAmount(order, amount, unitPrice);
      fee = this.calculateFee(order, resultAmount);
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
      amount = MarketHelper.convertFromBigint(amount);
      unitPrice = MarketHelper.convertFromBigint(unitPrice);
      return MarketHelper.convertToBigint(math.multiply(amount, unitPrice));
    },
    calculateFee: function(order, amount) {
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
