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
    var FEE, ORDERS_MATCH_LIMIT, Order;
    FEE = 0.2;
    ORDERS_MATCH_LIMIT = 10;
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
        matchFirstOrder: function(callback) {
          if (callback == null) {
            callback = function() {};
          }
          return GLOBAL.db.sequelize.transaction(function(transaction) {
            var orderToMatchQuery;
            orderToMatchQuery = {
              where: {
                status: {
                  ne: MarketHelper.getOrderStatus("completed")
                }
              },
              order: [["created_at", "ASC"]],
              limit: 1
            };
            return Order.find(orderToMatchQuery, {
              transaction: transaction
            }).complete(function(err, orderToMatch) {
              var matchingOrdersQuery;
              if (err) {
                return err;
              }
              if (!orderToMatch) {
                return callback();
              }
              matchingOrdersQuery = {
                where: {
                  action: MarketHelper.getOrderAction(orderToMatch.inversed_action),
                  buy_currency: MarketHelper.getCurrency(orderToMatch.sell_currency),
                  sell_currency: MarketHelper.getCurrency(orderToMatch.buy_currency),
                  unit_price: orderToMatch.unit_price,
                  status: {
                    ne: MarketHelper.getOrderStatus("completed")
                  }
                },
                order: [["created_at", "ASC"]],
                limit: ORDERS_MATCH_LIMIT
              };
              return Order.findAll(matchingOrdersQuery, {
                transaction: transaction
              }).complete(function(err, matchingOrders) {
                var orderIdsToSave, updateOrderCallback;
                orderIdsToSave = Order.matchOrderAmounts(orderToMatch, matchingOrders);
                if (!orderIdsToSave.length) {
                  return callback();
                }
                orderIdsToSave.push(orderToMatch.id);
                matchingOrders.push(orderToMatch);
                matchingOrders = matchingOrders.filter(function(o) {
                  return orderIdsToSave.indexOf(o.id) > -1;
                });
                updateOrderCallback = function(order, cb) {
                  return order.save({
                    transaction: transaction
                  }).complete(function(err, savedOrder) {
                    if (err) {
                      return cb(err, savedOrder);
                    }
                    return GLOBAL.db.Event.add("order_updated", order.getEventValues(), transaction, function() {
                      return cb(err, savedOrder);
                    });
                  });
                };
                return async.each(matchingOrders, updateOrderCallback, function(err, result) {
                  if (err) {
                    console.error("Could not match order " + orderToMatch.id + " - " + (JSON.stringify(err)));
                    return transaction.rollback().success(function() {
                      return callback(err);
                    });
                  }
                  return transaction.commit().success(function() {
                    return callback(null, orderIdsToSave);
                  });
                });
              });
            });
          });
        },
        matchOrderAmounts: function(orderToMatch, matchingOrders) {
          var amountToMatch, changedOrderIds, matchingOrder, _i, _len;
          changedOrderIds = [];
          for (_i = 0, _len = matchingOrders.length; _i < _len; _i++) {
            matchingOrder = matchingOrders[_i];
            if (orderToMatch.left_amount === 0) {
              orderToMatch.adjustStatusByAmounts();
              return changedOrderIds;
            }
            amountToMatch = matchingOrder.left_amount > orderToMatch.left_amount ? orderToMatch.left_amount : matchingOrder.left_amount;
            orderToMatch.addMatchedAmount(amountToMatch);
            orderToMatch.addResultAmount(amountToMatch);
            orderToMatch.addFee(amountToMatch);
            matchingOrder.addMatchedAmount(amountToMatch);
            matchingOrder.addResultAmount(amountToMatch);
            matchingOrder.addFee(amountToMatch);
            matchingOrder.adjustStatusByAmounts();
            changedOrderIds.push(matchingOrder.id);
          }
          orderToMatch.adjustStatusByAmounts();
          return changedOrderIds;
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
          var resultAmount;
          resultAmount = this.calculateResultAmount(amount);
          return math.select(resultAmount).divide(100).multiply(FEE).done();
        },
        addMatchedAmount: function(amount) {
          return this.matched_amount = math.add(this.matched_amount, amount);
        },
        addResultAmount: function(amount) {
          var fee, resultAmount;
          resultAmount = this.calculateResultAmount(amount);
          fee = this.calculateFee(amount);
          return this.result_amount = math.select(this.result_amount).add(resultAmount).add(-fee).done();
        },
        addFee: function(amount) {
          return this.fee = math.add(this.fee, this.calculateFee(amount));
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
        },
        getEventValues: function() {
          var data;
          return data = {
            order_id: this.external_order_id,
            matched_amount: this.matched_amount,
            result_amount: this.result_amount,
            fee: this.fee,
            status: this.status,
            update_time: this.updated_at
          };
        }
      }
    });
    return Order;
  };

}).call(this);
