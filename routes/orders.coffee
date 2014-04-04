restify = require "restify"
Order = GLOBAL.db.Order

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
    Order.create(orderData).complete (err, order)->
      return next(new restify.ConflictError err)  if err
      res.send order

  app.del "/order/:order_id", (req, res, next)->
    orderId = req.params.order_id
    #console.log orderId
    Order.deleteOpen orderId, (err)->
      return next(new restify.ConflictError err)  if err
      res.send
        order_id: orderId
