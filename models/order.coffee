MarketHelper = require "../lib/market_helper"
_ = require "underscore"
async = require "async"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

module.exports = (sequelize, DataTypes) ->

  FEE = 0.2

  Order = sequelize.define "Order",
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
      action:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        comment: "buy, sell"
        get: ()->
          MarketHelper.getOrderActionLiteral @getDataValue("action")
        set: (action)->
          @setDataValue "action", MarketHelper.getOrderAction(action)
      buy_currency:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        get: ()->
          MarketHelper.getCurrencyLiteral @getDataValue("buy_currency")
        set: (buyCurrency)->
          @setDataValue "buy_currency", MarketHelper.getCurrency(buyCurrency)
      sell_currency:
        type: DataTypes.INTEGER.UNSIGNED
        allowNull: false
        get: ()->
          MarketHelper.getCurrencyLiteral @getDataValue("sell_currency")
        set: (sellCurrency)->
          @setDataValue "sell_currency", MarketHelper.getCurrency(sellCurrency)
      amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        allowNull: false
        validate:
          isFloat: true
          notNull: true
      matched_amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isFloat: true
      result_amount:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isFloat: true
      fee:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isFloat: true
      unit_price:
        type: DataTypes.BIGINT.UNSIGNED
        defaultValue: 0
        validate:
          isFloat: true
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
      tableName: "orders"
      getterMethods:

        inversed_action: ()->
          return "buy"  if @action is "sell"
          return "sell"  if @action is "buy"

        left_amount: ()->
          math.add @amount, -@matched_amount
      
      classMethods:
        
        findById: (id, callback)->
          Order.find(id).complete callback

        findByOrderId: (orderId, callback)->
          Order.find({where: {external_order_id: orderId}}).complete callback

        findNext: (callback = ()->)->
          orderToMatchQuery =
            where:
              status:
                ne: MarketHelper.getOrderStatus "completed"
            order: [
              ["created_at", "ASC"]
            ]
          Order.find(orderToMatchQuery).complete callback

        findMatchingOrder: (orderToMatch, callback = ()->)->
          matchingOrdersQuery =
            where:
              action: MarketHelper.getOrderAction orderToMatch.inversed_action
              buy_currency: MarketHelper.getCurrency orderToMatch.sell_currency
              sell_currency: MarketHelper.getCurrency orderToMatch.buy_currency
              status:
                ne: MarketHelper.getOrderStatus "completed"
            order: [
              ["created_at", "ASC"]
            ]
          if orderToMatch.action is "buy"
            matchingOrdersQuery.where.unit_price =
              lte: orderToMatch.unit_price
          if orderToMatch.action is "sell"
            matchingOrdersQuery.where.unit_price =
              gte: orderToMatch.unit_price
          Order.find(matchingOrdersQuery).complete callback

        matchFirstOrder: (callback = ()->)->
          Order.findNext (err, orderToMatch)->
            return err  if err
            return callback()  if not orderToMatch
            Order.findMatchingOrder orderToMatch, (err, matchingOrder)->
              return callback()  if not matchingOrder
              GLOBAL.db.sequelize.transaction (transaction)->
                matchResult = Order.matchOrders orderToMatch, matchingOrder
                updateOrderCallback = (order, cb)->
                  order.save({transaction: transaction}).complete cb
                async.each [orderToMatch, matchingOrder], updateOrderCallback, (err, result)->
                  if err
                    console.error "Could not match order #{orderToMatch.id} with #{matchingOrder.id} - #{JSON.stringify(err)}"
                    return transaction.rollback().success ()->
                      callback err
                  GLOBAL.db.Event.add "orders_match", matchResult, transaction, (err)->
                    if err
                      console.error "Could not add event for matching order #{orderToMatch.id} with #{matchingOrder.id} - #{JSON.stringify(err)}"
                      return transaction.rollback().success ()->
                        callback err
                    transaction.commit().success ()->
                      callback null, matchResult

        matchOrders: (orderToMatch, matchingOrder)->
          amountToMatch = if matchingOrder.left_amount > orderToMatch.left_amount then orderToMatch.left_amount else matchingOrder.left_amount
          matchResult = []
          matchResult.push orderToMatch.matchOrderAmount amountToMatch, matchingOrder.unit_price
          matchResult.push matchingOrder.matchOrderAmount amountToMatch, matchingOrder.unit_price
          matchResult

        deleteOpen: (externalId, callback)->
          query =
            external_order_id: externalId
            status:
              ne: MarketHelper.getOrderStatus "completed"
          Order.destroy(query).complete callback    

      instanceMethods:

        matchOrderAmount: (amount, unitPrice)->
          resultAmount = @calculateResultAmount amount, unitPrice
          fee = @calculateFee resultAmount
          resultAmount = math.add resultAmount, -fee
          @addMatchedAmount amount
          @addResultAmount resultAmount
          @addFee fee
          @adjustStatusByAmounts()
          result =
            id: @id
            order_id: @external_order_id
            matched_amount: amount
            result_amount: resultAmount
            fee: fee
            unit_price: unitPrice
            status: @status

        calculateResultAmount: (amount, unitPrice)->
          return amount  if @action is "buy"
          amount = MarketHelper.convertFromBigint amount
          unitPrice = MarketHelper.convertFromBigint unitPrice
          MarketHelper.convertToBigint math.multiply(amount, unitPrice)

        calculateFee: (amount)->
          math.select(amount).divide(100).multiply(FEE).done()

        addMatchedAmount: (amount)->
          @matched_amount = math.add @matched_amount, amount

        addResultAmount: (amount)->
          @result_amount = math.add @result_amount, amount

        addFee: (amount)->
          @fee = math.add @fee, amount

        adjustStatusByAmounts: ()->
          return @status = "completed"  if @left_amount is 0
          return @status = "partiallyCompleted"  if @matched_amount > 0 and @matched_amount < @amount
          return @status = "open"  if @matched_amount is 0

  Order
