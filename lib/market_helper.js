(function() {
  var AVAILABLE_MARKETS, CURRENCIES, CURRENCY_NAMES, EVENT_STATUS, EVENT_TYPE, MARKET_STATUS, MarketHelper, ORDER_ACTIONS, ORDER_STATUS, ORDER_TYPES, exports, math, _;

  _ = require("underscore");

  math = require("mathjs")({
    number: "bignumber",
    decimals: 8
  });

  CURRENCIES = {
    BTC: 1,
    LTC: 2,
    PPC: 3,
    DOGE: 4
  };

  CURRENCY_NAMES = {
    BTC: "Bitcoin",
    LTC: "Litecoin",
    PPC: "Peercoin",
    DOGE: "Dogecoin"
  };

  AVAILABLE_MARKETS = {
    LTC_BTC: 1,
    PPC_BTC: 2,
    DOGE_BTC: 3
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

  MARKET_STATUS = {
    enabled: 1,
    disabled: 2
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
    getMarkets: function() {
      return AVAILABLE_MARKETS;
    },
    getMarket: function(type) {
      return AVAILABLE_MARKETS[type];
    },
    getMarketTypes: function() {
      return Object.keys(AVAILABLE_MARKETS);
    },
    getMarketLiteral: function(intType) {
      return _.invert(AVAILABLE_MARKETS)[intType];
    },
    isValidMarket: function(action, buyCurrency, sellCurrency) {
      var market;
      if (action === "buy") {
        market = "" + buyCurrency + "_" + sellCurrency;
      }
      if (action === "sell") {
        market = "" + sellCurrency + "_" + buyCurrency;
      }
      return !!AVAILABLE_MARKETS[market];
    },
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
    getCurrencyNames: function() {
      return CURRENCY_NAMES;
    },
    getCurrencyName: function(currency) {
      return CURRENCY_NAMES[currency];
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
    getMarketStatus: function(status) {
      return MARKET_STATUS[status];
    },
    getMarketStatusLiteral: function(intStatus) {
      return _.invert(MARKET_STATUS)[intStatus];
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
    }
  };

  exports = module.exports = MarketHelper;

}).call(this);
