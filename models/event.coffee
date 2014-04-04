request = require "request"
MarketHelper = require "../lib/market_helper"

module.exports = (sequelize, DataTypes) ->

  EVENTS_FETCH_LIMIT = 1

  Event = sequelize.define "Event",
      type:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        comment: "orders_match, order_canceled"
        get: ()->
          MarketHelper.getEventTypeLiteral @getDataValue("type")
        set: (type)->
          @setDataValue "type", MarketHelper.getEventType(type)
      loadout:
        type: DataTypes.TEXT
        allowNull: true
        get: ()->
          JSON.parse @getDataValue("loadout")
        set: (loadout)->
          @setDataValue "loadout", JSON.stringify(loadout)
      status:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        defaultValue: MarketHelper.getEventStatus "unsent"
        comment: "unsent, sent"
        get: ()->
          MarketHelper.getEventStatusLiteral @getDataValue("status")
        set: (status)->
          @setDataValue "status", MarketHelper.getEventStatus(status)
    ,
      tableName: "events"
      classMethods:

        add: (type, loadout, transaction, callback = ()->)->
          Event.create({type: type, loadout: loadout}, {transaction: transaction}).complete callback

        findNext: (callback = ()->)->
          query =
            where:
              status: MarketHelper.getEventStatus("unsent")
            order: [
              ["created_at", "ASC"]
            ]
            limit: EVENTS_FETCH_LIMIT
          Event.find(query).complete callback

        sendNext: (callback = ()->)->
          Event.findNext (err, event)->
            return callback err  if err or not event
            options =
              uri: GLOBAL.appConfig().app_host
              method: "POST"
              json: event.loadout
            try
              request options, (err, response, body)->
                if err or response.statusCode isnt 200
                  console.error "Could not send event #{event.id} - #{err}"
                  return callback err
                event.status = "sent"
                return event.save().complete callback
            catch e
              console.error e
              callback "Bad response #{e}"

  Event
