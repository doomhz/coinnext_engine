(function() {
  var Order, restify;

  restify = require("restify");

  Order = GLOBAL.db.Order;

  module.exports = function(app) {
    app.post("/order/:order_id", function(req, res, next) {
      var orderData;
      orderData = req.body;
      console.log(orderData);
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
      console.log(orderId);
      return Order.destroy({
        order_id: orderId
      }).complete(function(err) {
        if (err) {
          return next(new restify.ConflictError(err));
        }
        return res.send({
          order_id: orderId
        });
      });
    });
  };

}).call(this);
