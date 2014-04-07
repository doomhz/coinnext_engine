require "./../../helpers/spec_helper"
MarketHelper = require "./../../../lib/market_helper"
OrderBook = require "./../../../lib/order_book"

describe "OrderBook", ->

  beforeEach (done)->
    GLOBAL.db.sequelize.sync({force: true}).complete ()->
      done()

  describe "matchFirstOrder", ()->
    describe "when there is a big buy order and a couple of small orders to match", ()->
      now = Date.now()
      buyOrdersData = [
        {id: 1, external_order_id: 5, type: "limit", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 5000}
        {id: 5, external_order_id: 13, type: "limit", action: "buy", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(5), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 1500}
      ]
      sellOrdersData = [
        {id: 2, external_order_id: 8, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(2), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 4000}
        {id: 3, external_order_id: 10, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(3), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 3000}
        {id: 4, external_order_id: 12, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(4), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 2000}
      ]
      matchingResult = [
        {id: 1, order_id: 5, matched_amount: 200000000, result_amount: 199600000, fee: 400000, unit_price: MarketHelper.convertToBigint(0.1), status: "partiallyCompleted"}
        {id: 2, order_id: 8, matched_amount: 200000000, result_amount: 19960000, fee: 40000, unit_price: MarketHelper.convertToBigint(0.1), status: "completed"}
      ]

      beforeEach (done)->
        GLOBAL.db.BuyOrder.bulkCreate(buyOrdersData).success ()->
          GLOBAL.db.SellOrder.bulkCreate(sellOrdersData).success ()->
            done()

      it "returns the mathcing result", (done)->
        OrderBook.matchFirstOrder (err, result)->
          result.should.match matchingResult
          done()

      it "sets the big order as partiallyCompleted", (done)->
        OrderBook.matchFirstOrder (err, affectedOrderIds)->
          GLOBAL.db.BuyOrder.find(1).success (order)->
            order.status.should.eql "partiallyCompleted"
            done()

      it "sets the matching order as completed", (done)->
        OrderBook.matchFirstOrder (err, affectedOrderIds)->
          GLOBAL.db.SellOrder.find(2).success (order)->
            order.status.should.eql "completed"
            done()

      it "does not process the older orders", (done)->
        OrderBook.matchFirstOrder (err, affectedOrderIds)->
          GLOBAL.db.SellOrder.findAll({where: {id: in: [3, 4, 5]}}).success (orders)->
            for order in orders
              order.status.should.eql "open"
            done()

      it "sets the big order amounts", (done)->
        OrderBook.matchFirstOrder (err, affectedOrderIds)->
          GLOBAL.db.BuyOrder.find(1).success (order)->
            order.matched_amount.should.eql 200000000
            order.result_amount.should.eql 199600000
            order.fee.should.eql 400000
            done()

      it "sets the matched order amounts", (done)->
        OrderBook.matchFirstOrder (err, affectedOrderIds)->
          GLOBAL.db.SellOrder.find(2).success (order)->
            order.matched_amount.should.eql 200000000
            order.result_amount.should.eql 19960000
            order.fee.should.eql 40000
            done()

      it "adds a matching event about the last match", (done)->
        OrderBook.matchFirstOrder (err, result)->
          GLOBAL.db.Event.findNext (err, event)->
            event.loadout.should.eql matchingResult
            done()
