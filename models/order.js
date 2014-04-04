(function() {
  var MarketHelper, async, math, _;

  MarketHelper = require("../lib/market_helper");

  _ = require("underscore");

  async = require("async");

  math = require("mathjs")({
    number: "bignumber",
    decimals: 8
  });

  module.exports = function(sequelize, DataTypes) {
    var FEE, Order;
    FEE = 0.2;
    Order = sequelize.define("Order", {
      external_order_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true
      },
      type: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "market, limit",
        get: function() {
          return MarketHelper.getOrderTypeLiteral(this.getDataValue("type"));
        },
        set: function(type) {
          return this.setDataValue("type", MarketHelper.getOrderType(type));
        }
      },
      action: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "buy, sell",
        get: function() {
          return MarketHelper.getOrderActionLiteral(this.getDataValue("action"));
        },
        set: function(action) {
          return this.setDataValue("action", MarketHelper.getOrderAction(action));
        }
      },
      buy_currency: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        get: function() {
          return MarketHelper.getCurrencyLiteral(this.getDataValue("buy_currency"));
        },
        set: function(buyCurrency) {
          return this.setDataValue("buy_currency", MarketHelper.getCurrency(buyCurrency));
        }
      },
      sell_currency: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        get: function() {
          return MarketHelper.getCurrencyLiteral(this.getDataValue("sell_currency"));
        },
        set: function(sellCurrency) {
          return this.setDataValue("sell_currency", MarketHelper.getCurrency(sellCurrency));
        }
      },
      amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
        validate: {
          isFloat: true,
          notNull: true
        }
      },
      matched_amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isFloat: true
        }
      },
      result_amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isFloat: true
        }
      },
      fee: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isFloat: true
        }
      },
      unit_price: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isFloat: true
        }
      },
      status: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: MarketHelper.getOrderStatus("open"),
        comment: "open, partiallyCompleted, completed",
        get: function() {
          return MarketHelper.getOrderStatusLiteral(this.getDataValue("status"));
        },
        set: function(status) {
          return this.setDataValue("status", MarketHelper.getOrderStatus(status));
        }
      }
    }, {
      tableName: "orders",
      getterMethods: {
        inversed_action: function() {
          if (this.action === "sell") {
            return "buy";
          }
          if (this.action === "buy") {
            return "sell";
          }
        },
        left_amount: function() {
          return math.add(this.amount, -this.matched_amount);
        }
      },
      classMethods: {
        findById: function(id, callback) {
          return Order.find(id).complete(callback);
        },
        findByOrderId: function(orderId, callback) {
          return Order.find({
            where: {
              external_order_id: orderId
            }
          }).complete(callback);
        },
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
          return Order.find(orderToMatchQuery).complete(callback);
        },
        findMatchingOrder: function(orderToMatch, callback) {
          var matchingOrdersQuery;
          if (callback == null) {
            callback = function() {};
          }
          matchingOrdersQuery = {
            where: {
              action: MarketHelper.getOrderAction(orderToMatch.inversed_action),
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
          return Order.find(matchingOrdersQuery).complete(callback);
        },
        matchFirstOrder: function(callback) {
          if (callback == null) {
            callback = function() {};
          }
          return Order.findNext(function(err, orderToMatch) {
            if (err) {
              return err;
            }
            if (!orderToMatch) {
              return callback();
            }
            return Order.findMatchingOrder(orderToMatch, function(err, matchingOrder) {
              if (!matchingOrder) {
                return callback();
              }
              return GLOBAL.db.sequelize.transaction(function(transaction) {
                var matchResult, updateOrderCallback;
                matchResult = Order.matchOrders(orderToMatch, matchingOrder);
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
          matchResult.push(orderToMatch.matchOrderAmount(amountToMatch));
          matchResult.push(matchingOrder.matchOrderAmount(amountToMatch));
          return matchResult;
        },
        deleteOpen: function(externalId, callback) {
          var query;
          query = {
            external_order_id: externalId,
            status: {
              ne: MarketHelper.getOrderStatus("completed")
            }
          };
          return Order.destroy(query).complete(callback);
        }
      },
      instanceMethods: {
        matchOrderAmount: function(amount) {
          var fee, result, resultAmount;
          resultAmount = this.calculateResultAmount(amount);
          fee = this.calculateFee(resultAmount);
          resultAmount = math.add(resultAmount, -fee);
          this.addMatchedAmount(amount);
          this.addResultAmount(resultAmount);
          this.addFee(fee);
          this.adjustStatusByAmounts();
          return result = {
            id: this.id,
            order_id: this.external_order_id,
            matched_amount: amount,
            result_amount: resultAmount,
            fee: fee,
            status: this.status
          };
        },
        calculateResultAmount: function(amount) {
          var unitPrice;
          if (this.action === "buy") {
            return amount;
          }
          amount = MarketHelper.convertFromBigint(amount);
          unitPrice = MarketHelper.convertFromBigint(this.unit_price);
          return MarketHelper.convertToBigint(math.multiply(amount, unitPrice));
        },
        calculateFee: function(amount) {
          return math.select(amount).divide(100).multiply(FEE).done();
        },
        addMatchedAmount: function(amount) {
          return this.matched_amount = math.add(this.matched_amount, amount);
        },
        addResultAmount: function(amount) {
          return this.result_amount = math.add(this.result_amount, amount);
        },
        addFee: function(amount) {
          return this.fee = math.add(this.fee, amount);
        },
        adjustStatusByAmounts: function() {
          if (this.left_amount === 0) {
            return this.status = "completed";
          }
          if (this.matched_amount > 0 && this.matched_amount < this.amount) {
            return this.status = "partiallyCompleted";
          }
          if (this.matched_amount === 0) {
            return this.status = "open";
          }
        }
      }
    });
    return Order;
  };

}).call(this);
