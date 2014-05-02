_ = require "underscore"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

FEE = 0

#CURRENCIES = [
#  "BTC", "LTC", "PPC", "WDC", "NMC", "QRK",
#  "NVC", "ZET", "FTC", "XPM", "MEC", "TRC"
#]

CURRENCIES =
  BTC: 1
  LTC: 2
  PPC: 3
  DOGE: 4
  NMC: 5

CURRENCY_NAMES =
  BTC: "Bitcoin"
  LTC: "Litecoin"
  PPC: "Peercoin"
  DOGE: "Dogecoin"
  NMC: "Namecoin"

AVAILABLE_MARKETS =
  LTC_BTC: 1
  PPC_BTC: 2
  DOGE_BTC: 3
  NMC_BTC: 4

ORDER_TYPES =
  market: 1
  limit: 2

ORDER_ACTIONS =
  buy: 1
  sell: 2

ORDER_STATUS =
  open: 1
  partiallyCompleted: 2
  completed: 3

MARKET_STATUS =
  enabled: 1
  disabled: 2

EVENT_TYPE =
  orders_match: 1
  order_canceled: 2

EVENT_STATUS =
  unsent: 1
  sent: 2

MarketHelper =

  getMarkets: ()->
    AVAILABLE_MARKETS

  getMarket: (type)->
    AVAILABLE_MARKETS[type]

  getMarketTypes: ()->
    Object.keys AVAILABLE_MARKETS

  getMarketLiteral: (intType)->
    _.invert(AVAILABLE_MARKETS)[intType]

  isValidMarket: (action, buyCurrency, sellCurrency)->
    market = "#{buyCurrency}_#{sellCurrency}"  if action is "buy"
    market = "#{sellCurrency}_#{buyCurrency}"  if action is "sell"
    !!AVAILABLE_MARKETS[market]

  getOrderStatus: (status)->
    ORDER_STATUS[status]

  getOrderStatusLiteral: (intStatus)->
    _.invert(ORDER_STATUS)[intStatus]

  getOrderAction: (action)->
    ORDER_ACTIONS[action]

  getOrderActionLiteral: (intAction)->
    _.invert(ORDER_ACTIONS)[intAction]

  getOrderType: (type)->
    ORDER_TYPES[type]

  getOrderTypeLiteral: (intType)->
    _.invert(ORDER_TYPES)[intType]

  getCurrencies: (currency)->
    CURRENCIES

  getCurrencyTypes: ()->
    Object.keys CURRENCIES

  getCurrency: (currency)->
    CURRENCIES[currency]

  getCurrencyLiteral: (intCurrency)->
    _.invert(CURRENCIES)[intCurrency]

  getCurrencyNames: ()->
    CURRENCY_NAMES

  getCurrencyName: (currency)->
    CURRENCY_NAMES[currency]

  isValidCurrency: (currency)->
    !!CURRENCIES[currency]

  convertToBigint: (value)->
    math.multiply value, 100000000

  convertFromBigint: (value)->
    math.divide value, 100000000

  getMarketStatus: (status)->
    MARKET_STATUS[status]

  getMarketStatusLiteral: (intStatus)->
    _.invert(MARKET_STATUS)[intStatus]

  getEventType: (type)->
    EVENT_TYPE[type]

  getEventTypeLiteral: (intType)->
    _.invert(EVENT_TYPE)[intType]

  getEventStatus: (status)->
    EVENT_STATUS[status]

  getEventStatusLiteral: (intStatus)->
    _.invert(EVENT_STATUS)[intStatus]

  getTradeFee: ()->
    FEE

exports = module.exports = MarketHelper