restify = require "restify"
Order = GLOBAL.db.Order

module.exports = (app)->

  app.post "/order/:order_id", (req, res, next)->
    orderData = req.body
    console.log orderData
    Order.create(orderData).complete (err, order)->
      return next(new restify.ConflictError err)  if err
      res.send order

  app.del "/order/:order_id", (req, res, next)->
    orderId = req.params.order_id
    console.log orderId
    Order.destroy({order_id: orderId}).complete (err)->
      return next(new restify.ConflictError err)  if err
      res.send
        order_id: orderId
