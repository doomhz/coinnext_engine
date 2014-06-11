MarketHelper = require "../lib/market_helper"
math = require "../lib/math"

module.exports = (sequelize, DataTypes) ->

  SellOrder = sequelize.define "SellOrder",
      external_order_id:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        unique: true
      type:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        comment: "market, limit"
        get: ()->
          MarketHelper.getOrderTypeLiteral @getDataValue("type")
        set: (type)->
          @setDataValue "type", MarketHelper.getOrderType(type)
      buy_currency:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
      sell_currency:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
      amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        allowNull: false
        validate:
          isInt: true
          notNull: true
      matched_amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isInt: true
      result_amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isInt: true
      fee:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isInt: true
      unit_price:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isInt: true
      status:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        defaultValue: MarketHelper.getOrderStatus "open"
        comment: "open, partiallyCompleted, completed"
        get: ()->
          MarketHelper.getOrderStatusLiteral @getDataValue("status")
        set: (status)->
          @setDataValue "status", MarketHelper.getOrderStatus(status)
    ,
      tableName: "sell_orders"
      paranoid: true
      getterMethods:

        left_amount: ()->
          parseInt math.subtract(MarketHelper.toBignum(@amount), MarketHelper.toBignum(@matched_amount))

        action: ()->
          "sell"

      classMethods:
        
        findById: (id, callback)->
          SellOrder.find(id).complete callback

        findByOrderId: (orderId, callback)->
          SellOrder.find({where: {external_order_id: orderId}}).complete callback

  SellOrder
