BuyOrder = GLOBAL.db.BuyOrder
SellOrder = GLOBAL.db.SellOrder
MarketHelper = require "./market_helper"
async = require "async"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

OrderBook =

  findNext: (callback = ()->)->
    orderToMatchQuery =
      where:
        status:
          ne: MarketHelper.getOrderStatus "completed"
      order: [
        ["created_at", "ASC"]
      ]
    BuyOrder.find(orderToMatchQuery).complete callback

  findMatchingOrder: (orderToMatch, callback = ()->)->
    matchingOrdersQuery =
      where:
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
    SellOrder.find(matchingOrdersQuery).complete callback

  matchFirstOrder: (callback = ()->)->
    OrderBook.findNext (err, orderToMatch)->
      return err  if err
      return callback()  if not orderToMatch
      OrderBook.findMatchingOrder orderToMatch, (err, matchingOrder)->
        return callback()  if not matchingOrder
        GLOBAL.db.sequelize.transaction (transaction)->
          matchResult = OrderBook.matchOrders orderToMatch, matchingOrder
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
    matchResult.push @matchOrderAmount orderToMatch, amountToMatch, matchingOrder.unit_price
    matchResult.push @matchOrderAmount matchingOrder, amountToMatch, matchingOrder.unit_price
    matchResult

  matchOrderAmount: (order, amount, unitPrice)->
    resultAmount = @calculateResultAmount order, amount, unitPrice
    fee = @calculateFee order, resultAmount
    resultAmount = math.add resultAmount, -fee
    @addMatchedAmount order, amount
    @addResultAmount order, resultAmount
    @addFee order, fee
    @adjustStatusByAmounts order
    result =
      id: order.id
      order_id: order.external_order_id
      matched_amount: amount
      result_amount: resultAmount
      fee: fee
      unit_price: unitPrice
      status: order.status

  calculateResultAmount: (order, amount, unitPrice)->
    return amount  if order.action is "buy"
    amount = MarketHelper.convertFromBigint amount
    unitPrice = MarketHelper.convertFromBigint unitPrice
    MarketHelper.convertToBigint math.multiply(amount, unitPrice)

  calculateFee: (order, amount)->
    math.select(amount).divide(100).multiply(MarketHelper.getTradeFee()).done()

  addMatchedAmount: (order, amount)->
    order.matched_amount = math.add order.matched_amount, amount

  addResultAmount: (order, amount)->
    order.result_amount = math.add order.result_amount, amount

  addFee: (order, amount)->
    order.fee = math.add order.fee, amount

  adjustStatusByAmounts: (order)->
    return order.status = "completed"  if order.left_amount is 0
    return order.status = "partiallyCompleted"  if order.matched_amount > 0 and order.matched_amount < order.amount
    return order.status = "open"  if order.matched_amount is 0

  addOrder: (data, callback = ()->)->
    actionObject = BuyOrder  if data.action is "buy"
    actionObject = SellOrder  if data.action is "sell"
    return callback "Wrong order action type #{data.action}"  if not actionObject
    actionObject.create(data).complete callback

  deleteOpenOrder: (externalId, callback = ()->)->
    query =
      where:
        external_order_id: externalId
        status:
          ne: MarketHelper.getOrderStatus "completed"
    BuyOrder.find(query).complete (err, order)->
      return callback err  if err
      return order.destroy().complete callback  if order
      SellOrder.find(query).complete (err, order)->
        return callback err  if err
        return order.destroy().complete callback  if order
        callback "Could not delete order #{externalId}. Might be already completed."

exports = module.exports = OrderBook