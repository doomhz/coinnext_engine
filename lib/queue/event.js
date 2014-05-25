(function() {
  var MarketHelper;

  MarketHelper = require("../market_helper");

  module.exports = function(sequelize, DataTypes) {
    var EVENTS_FETCH_LIMIT, Event, VALID_EVENTS;
    EVENTS_FETCH_LIMIT = 1;
    VALID_EVENTS = [MarketHelper.getEventType("cancel_order"), MarketHelper.getEventType("add_order")];
    Event = sequelize.define("Event", {
      type: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "orders_match, cancel_order, order_canceled, add_order, order_added",
        get: function() {
          return MarketHelper.getEventTypeLiteral(this.getDataValue("type"));
        },
        set: function(type) {
          return this.setDataValue("type", MarketHelper.getEventType(type));
        }
      },
      loadout: {
        type: DataTypes.TEXT,
        allowNull: true,
        get: function() {
          return JSON.parse(this.getDataValue("loadout"));
        },
        set: function(loadout) {
          return this.setDataValue("loadout", JSON.stringify(loadout));
        }
      },
      status: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: MarketHelper.getEventStatus("pending"),
        comment: "pending, processed",
        get: function() {
          return MarketHelper.getEventStatusLiteral(this.getDataValue("status"));
        },
        set: function(status) {
          return this.setDataValue("status", MarketHelper.getEventStatus(status));
        }
      }
    }, {
      tableName: "events",
      classMethods: {
        addMatchOrders: function(bulkLoadout, callback) {
          var data, loadout, _i, _len;
          if (callback == null) {
            callback = function() {};
          }
          data = [];
          for (_i = 0, _len = bulkLoadout.length; _i < _len; _i++) {
            loadout = bulkLoadout[_i];
            data.push({
              type: "orders_match",
              loadout: loadout,
              status: "pending"
            });
          }
          return Event.bulkCreate(data).complete(callback);
        },
        addOrderCanceled: function(loadout, callback) {
          var data;
          if (callback == null) {
            callback = function() {};
          }
          data = {
            type: "order_canceled",
            loadout: loadout,
            status: "pending"
          };
          return Event.create(data).complete(callback);
        },
        addOrderAdded: function(loadout, callback) {
          var data;
          if (callback == null) {
            callback = function() {};
          }
          data = {
            type: "order_added",
            loadout: loadout,
            status: "pending"
          };
          return Event.create(data).complete(callback);
        },
        findNext: function(type, callback) {
          var query;
          if (type == null) {
            type = null;
          }
          if (callback == null) {
            callback = function() {};
          }
          query = {
            where: {
              status: MarketHelper.getEventStatus("pending")
            },
            order: [["created_at", "ASC"]],
            limit: EVENTS_FETCH_LIMIT
          };
          if (type) {
            query.where.type = MarketHelper.getEventType(type);
          }
          return Event.find(query).complete(callback);
        },
        findNextValid: function(callback) {
          var query;
          if (callback == null) {
            callback = function() {};
          }
          query = {
            where: {
              status: MarketHelper.getEventStatus("pending"),
              type: VALID_EVENTS
            },
            order: [["created_at", "ASC"]],
            limit: EVENTS_FETCH_LIMIT
          };
          return Event.find(query).complete(callback);
        }
      }
    });
    return Event;
  };

}).call(this);
