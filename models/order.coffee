MarketHelper = require "../lib/market_helper"
_ = require "underscore"
async = require "async"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

module.exports = (sequelize, DataTypes) ->

  FEE = 0.2
  ORDERS_MATCH_LIMIT = 10

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

        matchFirstOrder: (callback = ()->)->
          GLOBAL.db.sequelize.transaction (transaction)->
            orderToMatchQuery =
              where:
                status:
                  ne: MarketHelper.getOrderStatus "completed"
              order: [
                ["created_at", "ASC"]
              ]
              limit: 1
            Order.find(orderToMatchQuery, {transaction: transaction}).complete (err, orderToMatch)->
              return err  if err
              return callback()  if not orderToMatch
              matchingOrdersQuery =
                where:
                  action: MarketHelper.getOrderAction orderToMatch.inversed_action
                  buy_currency: MarketHelper.getCurrency orderToMatch.sell_currency
                  sell_currency: MarketHelper.getCurrency orderToMatch.buy_currency
                  unit_price: orderToMatch.unit_price
                  status:
                    ne: MarketHelper.getOrderStatus "completed"
                order: [
                  ["created_at", "ASC"]
                ]
                limit: ORDERS_MATCH_LIMIT
              Order.findAll(matchingOrdersQuery, {transaction: transaction}).complete (err, matchingOrders)->
                orderIdsToSave = Order.matchOrderAmounts orderToMatch, matchingOrders
                orderIdsToSave.push orderToMatch.id
                matchingOrders.push orderToMatch
                matchingOrders = matchingOrders.filter (o)->
                  orderIdsToSave.indexOf(o.id) > -1
                updateOrderCallback = (order, cb)->
                  order.save({transaction: transaction}).complete (err, savedOrder)->
                    return cb err, savedOrder  if err
                    GLOBAL.db.Event.add "order_updated", order.getEventValues(), transaction, ()->
                      cb err, savedOrder
                async.each matchingOrders, updateOrderCallback, (err, result)->
                  if err
                    console.error "Could not match order #{orderToMatch.id} - #{JSON.stringify(err)}"
                    return transaction.rollback().success ()->
                      callback err
                  transaction.commit().success ()->
                    callback null, orderIdsToSave

        matchOrderAmounts: (orderToMatch, matchingOrders)->
          changedOrderIds = []
          for matchingOrder in matchingOrders
            if orderToMatch.left_amount is 0
              orderToMatch.adjustStatusByAmounts()
              return changedOrderIds
            amountToMatch = if matchingOrder.left_amount > orderToMatch.left_amount then orderToMatch.left_amount else matchingOrder.left_amount
            orderToMatch.addMatchedAmount amountToMatch
            orderToMatch.addResultAmount amountToMatch
            orderToMatch.addFee amountToMatch
            matchingOrder.addMatchedAmount amountToMatch
            matchingOrder.addResultAmount amountToMatch
            matchingOrder.addFee amountToMatch
            matchingOrder.adjustStatusByAmounts()
            changedOrderIds.push matchingOrder.id
          orderToMatch.adjustStatusByAmounts()
          return changedOrderIds

      instanceMethods:

        calculateResultAmount: (amount)->
          return amount  if @action is "buy"
          amount = MarketHelper.convertFromBigint amount
          unitPrice = MarketHelper.convertFromBigint @unit_price
          MarketHelper.convertToBigint math.multiply(amount, unitPrice)

        calculateFee: (amount)->
          resultAmount = @calculateResultAmount amount
          math.select(resultAmount).divide(100).multiply(FEE).done()

        addMatchedAmount: (amount)->
          @matched_amount = math.add @matched_amount, amount

        addResultAmount: (amount)->
          resultAmount = @calculateResultAmount amount
          fee = @calculateFee amount
          @result_amount = math.select(@result_amount).add(resultAmount).add(-fee).done()

        addFee: (amount)->
          @fee = math.add @fee, @calculateFee(amount)

        adjustStatusByAmounts: ()->
          return @status = "completed"  if @left_amount is 0
          return @status = "partiallyCompleted"  if @matched_amount > 0 and @matched_amount < @amount
          return @status = "open"  if @matched_amount is 0

        getEventValues: ()->
          data =
            order_id: @external_order_id
            matched_amount: @matched_amount
            result_amount: @result_amount
            fee: @fee
            status: @status
            update_time: @updated_at

  Order
