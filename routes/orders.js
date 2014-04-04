(function() {
  var Order, restify;

  restify = require("restify");

  Order = GLOBAL.db.Order;

  module.exports = function(app) {
    app.post("/order/:order_id", function(req, res, next) {
      var orderData, orderId;
      orderId = req.params.order_id;
      orderData = {
        external_order_id: orderId,
        type: req.body.type,
        action: req.body.action,
        buy_currency: req.body.buy_currency,
        sell_currency: req.body.sell_currency,
        amount: req.body.amount,
        unit_price: req.body.unit_price
      };
      return Order.create(orderData).complete(function(err, order) {
        if (err) {
          return next(new restify.ConflictError(err));
        }
        return res.send(order);
      });
    });
    return app.del("/order/:order_id", function(req, res, next) {
      var orderId;
      orderId = req.params.order_id;
      return Order.deleteOpen(orderId, function(err, destroyed) {
        if (err) {
          return next(new restify.ConflictError(err));
        }
        if (!destroyed) {
          return next(new restify.ConflictError("Order " + orderId + " could not be deleted."));
        }
        return res.send({
          order_id: orderId
        });
      });
    });
  };

}).call(this);
