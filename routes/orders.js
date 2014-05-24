(function() {
  var OrderBook, restify;

  restify = require("restify");

  OrderBook = require("./../lib/order_book");

  module.exports = function(app) {
    return app.post("/order/:order_id", function(req, res, next) {
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
      return OrderBook.addOrder(orderData, function(err, order) {
        if (err) {
          return next(new restify.ConflictError(err));
        }
        return res.send(order);
      });
    });
  };

}).call(this);
