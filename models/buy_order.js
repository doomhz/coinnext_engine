(function() {
  var MarketHelper, math;

  MarketHelper = require("../lib/market_helper");

  math = require("../lib/math");

  module.exports = function(sequelize, DataTypes) {
    var BuyOrder;
    BuyOrder = sequelize.define("BuyOrder", {
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
      buy_currency: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      sell_currency: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
        validate: {
          isInt: true,
          notNull: true
        }
      },
      matched_amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isInt: true
        }
      },
      result_amount: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isInt: true
        }
      },
      fee: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isInt: true
        }
      },
      unit_price: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: 0,
        validate: {
          isInt: true
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
      tableName: "buy_orders",
      paranoid: true,
      getterMethods: {
        left_amount: function() {
          return parseInt(math.subtract(MarketHelper.toBignum(this.amount), MarketHelper.toBignum(this.matched_amount)));
        },
        action: function() {
          return "buy";
        }
      },
      classMethods: {
        findById: function(id, callback) {
          return BuyOrder.find(id).complete(callback);
        },
        findByOrderId: function(orderId, callback) {
          return BuyOrder.find({
            where: {
              external_order_id: orderId
            }
          }).complete(callback);
        }
      }
    });
    return BuyOrder;
  };

}).call(this);
