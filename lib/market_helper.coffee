_ = require "underscore"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

FEE = 0

CURRENCIES =
  BTC: 1
  LTC: 2
  PPC: 3
  DOGE: 4
  NMC: 5
  DRK: 6
  XPM: 7
  BC: 8
  VTC: 9
  METH: 10
  NLG: 11
  TCO: 12
  CX: 13

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

EVENT_TYPE =
  orders_match: 1
  order_canceled: 2

EVENT_STATUS =
  unsent: 1
  sent: 2

MarketHelper =

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

  isValidCurrency: (currency)->
    !!CURRENCIES[currency]

  convertToBigint: (value)->
    math.multiply value, 100000000

  convertFromBigint: (value)->
    math.divide value, 100000000

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