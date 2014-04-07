restify = require "restify"
OrderBook = require "./../lib/order_book"

module.exports = (app)->

  app.post "/order/:order_id", (req, res, next)->
    orderId = req.params.order_id
    orderData =
      external_order_id: orderId
      type: req.body.type
      action: req.body.action
      buy_currency: req.body.buy_currency
      sell_currency: req.body.sell_currency
      amount: req.body.amount
      unit_price: req.body.unit_price
    #console.log orderData
    OrderBook.addOrder orderData, (err, order)->
      return next(new restify.ConflictError err)  if err
      res.send order

  app.del "/order/:order_id", (req, res, next)->
    orderId = req.params.order_id
    #console.log orderId
    OrderBook.deleteOpenOrder orderId, (err)->
      return next(new restify.ConflictError err)  if err
      res.send
        order_id: orderId
