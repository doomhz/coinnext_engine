(function() {
  var MarketHelper, request;

  request = require("request");

  MarketHelper = require("../lib/market_helper");

  module.exports = function(sequelize, DataTypes) {
    var EVENTS_FETCH_LIMIT, Event;
    EVENTS_FETCH_LIMIT = 1;
    Event = sequelize.define("Event", {
      type: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "orders_match, order_canceled",
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
        defaultValue: MarketHelper.getEventStatus("unsent"),
        comment: "unsent, sent",
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
        add: function(type, loadout, transaction, callback) {
          if (callback == null) {
            callback = function() {};
          }
          return Event.create({
            type: type,
            loadout: loadout
          }, {
            transaction: transaction
          }).complete(callback);
        },
        findNext: function(callback) {
          var query;
          if (callback == null) {
            callback = function() {};
          }
          query = {
            where: {
              status: MarketHelper.getEventStatus("unsent")
            },
            order: [["created_at", "ASC"]],
            limit: EVENTS_FETCH_LIMIT
          };
          return Event.find(query).complete(callback);
        },
        sendNext: function(callback) {
          if (callback == null) {
            callback = function() {};
          }
          return Event.findNext(function(err, event) {
            var e, options;
            if (err || !event) {
              return callback(err);
            }
            options = {
              uri: GLOBAL.appConfig().app_host,
              method: "POST",
              json: event.loadout
            };
            try {
              return request(options, function(err, response, body) {
                if (err || response.statusCode === 200) {
                  console.error("Could not send event " + event.id + " - " + err);
                  return callback(err);
                }
                event.status = "sent";
                return event.save().complete(callback);
              });
            } catch (_error) {
              e = _error;
              console.error(e);
              return callback("Bad response " + e);
            }
          });
        }
      }
    });
    return Event;
  };

}).call(this);
