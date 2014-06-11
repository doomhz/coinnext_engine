(function() {
  var EVENT_STATUS, EVENT_TYPE, FEE, MarketHelper, ORDER_ACTIONS, ORDER_STATUS, ORDER_TYPES, exports, math, _;

  _ = require("underscore");

  math = require("./math");

  FEE = 0;

  ORDER_TYPES = {
    market: 1,
    limit: 2
  };

  ORDER_ACTIONS = {
    buy: 1,
    sell: 2
  };

  ORDER_STATUS = {
    open: 1,
    partiallyCompleted: 2,
    completed: 3
  };

  EVENT_TYPE = {
    orders_match: 1,
    cancel_order: 2,
    order_canceled: 3,
    add_order: 4,
    order_added: 5
  };

  EVENT_STATUS = {
    pending: 1,
    processed: 2
  };

  MarketHelper = {
    getOrderStatus: function(status) {
      return ORDER_STATUS[status];
    },
    getOrderStatusLiteral: function(intStatus) {
      return _.invert(ORDER_STATUS)[intStatus];
    },
    getOrderAction: function(action) {
      return ORDER_ACTIONS[action];
    },
    getOrderActionLiteral: function(intAction) {
      return _.invert(ORDER_ACTIONS)[intAction];
    },
    getOrderType: function(type) {
      return ORDER_TYPES[type];
    },
    getOrderTypeLiteral: function(intType) {
      return _.invert(ORDER_TYPES)[intType];
    },
    isValidCurrency: function(currency) {
      return !!CURRENCIES[currency];
    },
    toBignum: function(value) {
      return math.bignumber(value.toString());
    },
    convertToBigint: function(value) {
      return parseInt(math.multiply(this.toBignum(value), this.toBignum(100000000)));
    },
    convertFromBigint: function(value) {
      return parseFloat(math.divide(this.toBignum(value), this.toBignum(100000000)));
    },
    multiplyBigints: function(value, value2) {
      return parseInt(math.divide(math.multiply(this.toBignum(value), this.toBignum(value2)), this.toBignum(100000000)));
    },
    getEventType: function(type) {
      return EVENT_TYPE[type];
    },
    getEventTypeLiteral: function(intType) {
      return _.invert(EVENT_TYPE)[intType];
    },
    getEventStatus: function(status) {
      return EVENT_STATUS[status];
    },
    getEventStatusLiteral: function(intStatus) {
      return _.invert(EVENT_STATUS)[intStatus];
    },
    getTradeFee: function() {
      return FEE;
    }
  };

  exports = module.exports = MarketHelper;

}).call(this);
