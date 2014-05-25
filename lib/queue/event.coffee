MarketHelper = require "../market_helper"

module.exports = (sequelize, DataTypes) ->

  EVENTS_FETCH_LIMIT = 1
  VALID_EVENTS = [
    MarketHelper.getEventType "cancel_order"
    MarketHelper.getEventType "add_order"
  ]

  Event = sequelize.define "Event",
      type:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        comment: "orders_match, cancel_order, order_canceled, add_order, order_added"
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
        defaultValue: MarketHelper.getEventStatus "pending"
        comment: "pending, processed"
        get: ()->
          MarketHelper.getEventStatusLiteral @getDataValue("status")
        set: (status)->
          @setDataValue "status", MarketHelper.getEventStatus(status)
    ,
      tableName: "events"
      classMethods:

        addMatchOrders: (bulkLoadout, callback = ()->)->
          data = []
          for loadout in bulkLoadout
            data.push
              type: "orders_match"
              loadout: loadout
              status: "pending"
          Event.bulkCreate(data).complete callback

        addOrderCanceled: (loadout, callback = ()->)->
          data =
            type: "order_canceled"
            loadout: loadout
            status: "pending"
          Event.create(data).complete callback

        addOrderAdded: (loadout, callback = ()->)->
          data =
            type: "order_added"
            loadout: loadout
            status: "pending"
          Event.create(data).complete callback

        findNext: (type = null, callback = ()->)->
          query =
            where:
              status: MarketHelper.getEventStatus "pending"
            order: [
              ["created_at", "ASC"]
            ]
            limit: EVENTS_FETCH_LIMIT
          query.where.type = MarketHelper.getEventType type  if type
          Event.find(query).complete callback

        findNextValid: (callback = ()->)->
          query =
            where:
              status: MarketHelper.getEventStatus "pending"
              type: VALID_EVENTS
            order: [
              ["created_at", "ASC"]
            ]
            limit: EVENTS_FETCH_LIMIT
          Event.find(query).complete callback

  Event
