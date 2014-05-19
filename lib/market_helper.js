(function() {
  var CURRENCIES, EVENT_STATUS, EVENT_TYPE, FEE, MarketHelper, ORDER_ACTIONS, ORDER_STATUS, ORDER_TYPES, exports, math, _;

  _ = require("underscore");

  math = require("mathjs")({
    number: "bignumber",
    decimals: 8
  });

  FEE = 0;

  CURRENCIES = {
    BTC: 1,
    LTC: 2,
    PPC: 3,
    DOGE: 4,
    NMC: 5,
    DRK: 6,
    XPM: 7,
    BC: 8,
    VTC: 9,
    METH: 10,
    NLG: 11,
    TCO: 12,
    CX: 13,
    BANK: 14
  };

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
    order_canceled: 2
  };

  EVENT_STATUS = {
    unsent: 1,
    sent: 2
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
    getCurrencies: function(currency) {
      return CURRENCIES;
    },
    getCurrencyTypes: function() {
      return Object.keys(CURRENCIES);
    },
    getCurrency: function(currency) {
      return CURRENCIES[currency];
    },
    getCurrencyLiteral: function(intCurrency) {
      return _.invert(CURRENCIES)[intCurrency];
    },
    isValidCurrency: function(currency) {
      return !!CURRENCIES[currency];
    },
    convertToBigint: function(value) {
      return math.multiply(value, 100000000);
    },
    convertFromBigint: function(value) {
      return math.divide(value, 100000000);
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
