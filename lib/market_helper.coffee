_ = require "underscore"
math = require "./math"

FEE = 0

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
  cancel_order: 2
  order_canceled: 3
  add_order: 4
  order_added: 5

EVENT_STATUS =
  pending: 1
  processed: 2

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

  isValidCurrency: (currency)->
    !!CURRENCIES[currency]

  toBignum: (value)->
    math.bignumber "#{value}"

  convertToBigint: (value)->
    parseInt math.multiply(@toBignum(value), @toBignum(100000000))

  convertFromBigint: (value)->
    parseFloat math.divide(@toBignum(value), @toBignum(100000000))

  multiplyBigints: (value, value2)->
    parseInt math.divide(math.multiply(@toBignum(value), @toBignum(value2)), @toBignum(100000000))

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