require "./../../helpers/spec_helper"
MarketHelper = require "./../../../lib/market_helper"
OrderBook = require "./../../../lib/order_book"

describe "OrderBook", ->

  beforeEach (done)->
    GLOBAL.db.sequelize.sync({force: true}).complete ()->
      done()

  describe "matchBuyOrders", ()->
    describe "when there is a big buy order and a couple of small orders to match", ()->
      now = Date.now()
      buyOrdersData = [
        {id: 1, external_order_id: 5, type: "limit", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 5000}
        {id: 5, external_order_id: 13, type: "limit", action: "buy", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(5), unit_price: MarketHelper.convertToBigint(0.2), status: "open", created_at: now - 1500}
      ]
      sellOrdersData = [
        {id: 2, external_order_id: 8, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(2), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 4000}
        {id: 3, external_order_id: 10, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(3), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 3000}
        {id: 4, external_order_id: 12, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(4), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 2000}
        {id: 6, external_order_id: 14, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(5), unit_price: MarketHelper.convertToBigint(0.2), status: "open", created_at: now - 1000}
      ]
      matchingResult = [
        [
          {id: 1, order_id: 5, matched_amount: 200000000, result_amount: 199600000, fee: 400000, unit_price: MarketHelper.convertToBigint(0.1), status: "partiallyCompleted"}
          {id: 2, order_id: 8, matched_amount: 200000000, result_amount: 19960000, fee: 40000, unit_price: MarketHelper.convertToBigint(0.1), status: "completed"}
        ]
        [
          {id: 1, order_id: 5, matched_amount: 300000000, result_amount: 299400000, fee: 600000, unit_price: MarketHelper.convertToBigint(0.1), status: "partiallyCompleted"}
          {id: 3, order_id: 10, matched_amount: 300000000, result_amount: 29940000, fee: 60000, unit_price: MarketHelper.convertToBigint(0.1), status: "completed"}
        ]
        [
          {id: 1, order_id: 5, matched_amount: 400000000, result_amount: 399200000, fee: 800000, unit_price: MarketHelper.convertToBigint(0.1), status: "partiallyCompleted"}
          {id: 4, order_id: 12, matched_amount: 400000000, result_amount: 39920000, fee: 80000, unit_price: MarketHelper.convertToBigint(0.1), status: "completed"}
        ]
      ]
      matchingResult2 = [
        [
          {id: 5, order_id: 13, matched_amount: 500000000, result_amount: 499000000, fee: 1000000, unit_price: MarketHelper.convertToBigint(0.2), status: "completed"}
          {id: 6, order_id: 14, matched_amount: 500000000, result_amount: 99800000, fee: 200000, unit_price: MarketHelper.convertToBigint(0.2), status: "completed"}
        ]
      ]

      beforeEach (done)->
        GLOBAL.db.BuyOrder.bulkCreate(buyOrdersData).success ()->
          GLOBAL.db.SellOrder.bulkCreate(sellOrdersData).success ()->
            done()

      it "returns the matching result", (done)->
        OrderBook.matchBuyOrders (err, result)->
          result.length.should.eql 2
          result[0].length.should.eql 3
          result[1].length.should.eql 1
          for res, index in result[0]
            res.should.eql matchingResult[index]
          for res, index in result[1]
            res.should.eql matchingResult2[index]
          done()

      it "sets the big order as partiallyCompleted", (done)->
        OrderBook.matchBuyOrders (err, affectedOrderIds)->
          GLOBAL.db.BuyOrder.find(1).success (order)->
            order.status.should.eql "partiallyCompleted"
            done()

      it "sets the matching orders as completed", (done)->
        OrderBook.matchBuyOrders (err, affectedOrderIds)->
          GLOBAL.db.SellOrder.findAll({where: {status: MarketHelper.getOrderStatus("completed"), id: [2, 3, 4]}}).success (orders)->
            orders.length.should.eql 3
            done()

      it "sets the big order amounts", (done)->
        OrderBook.matchBuyOrders (err, affectedOrderIds)->
          GLOBAL.db.BuyOrder.find(1).success (order)->
            order.matched_amount.should.eql 900000000
            order.result_amount.should.eql 898200000
            order.fee.should.eql 1800000
            done()

      it "sets the matched orders amounts", (done)->
        OrderBook.matchBuyOrders (err, affectedOrderIds)->
          GLOBAL.db.SellOrder.findAll({where: {id: [2, 3, 4]}}).success (orders)->
            expectedData =
              2: {matched_amount: 200000000, result_amount: 19960000, fee: 40000}
              3: {matched_amount: 300000000, result_amount: 29940000, fee: 60000}
              4: {matched_amount: 400000000, result_amount: 39920000, fee: 80000}
            for order in orders
              order.matched_amount.should.eql expectedData[order.id].matched_amount
              order.result_amount.should.eql expectedData[order.id].result_amount
              order.fee.should.eql expectedData[order.id].fee
            done()

      it "adds a matching event about the last match", (done)->
        OrderBook.matchBuyOrders (err, result)->
          GLOBAL.db.Event.findAll().complete (err, events)->
            for event, index in events
              if index < 3
                event.loadout.should.eql matchingResult[index]
              else
                event.loadout.should.eql matchingResult2[index - 3]
            done()


    describe "when there are multiple orders to match", ()->
      now = Date.now()
      buyOrdersData = [
        {id: 1, external_order_id: 5, type: "limit", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.2), status: "open", created_at: now - 7000}
        {id: 2, external_order_id: 6, type: "limit", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.2), status: "open", created_at: now - 5000}
      ]
      sellOrdersData = [
        {id: 2, external_order_id: 8, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 4000}        
      ]

      beforeEach (done)->
        GLOBAL.db.BuyOrder.bulkCreate(buyOrdersData).success ()->
          GLOBAL.db.SellOrder.bulkCreate(sellOrdersData).success ()->
            done()

      it "matches the oldest one first", (done)->
        OrderBook.matchBuyOrders (err, result)->
          GLOBAL.db.BuyOrder.find(1).success (olderOrder)->
            GLOBAL.db.BuyOrder.find(2).success (newerOrder)->
              olderOrder.matched_amount.should.eql 1000000000
              newerOrder.matched_amount.should.eql 0
              olderOrder.status.should.eql "completed"
              newerOrder.status.should.eql "open"
              done()


    describe "when there are multiple mathcing orders", ()->
      now = Date.now()
      buyOrdersData = [
        {id: 1, external_order_id: 5, type: "limit", buy_currency: "LTC", sell_currency: "BTC", amount: MarketHelper.convertToBigint(10), unit_price: MarketHelper.convertToBigint(0.2), status: "open", created_at: now - 5000}
      ]
      sellOrdersData = [
        {id: 2, external_order_id: 8, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(9), unit_price: MarketHelper.convertToBigint(0.1), status: "open", created_at: now - 4000}
        {id: 3, external_order_id: 10, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(3), unit_price: MarketHelper.convertToBigint(0.15), status: "open", created_at: now - 5000}
        {id: 4, external_order_id: 11, type: "limit", buy_currency: "BTC", sell_currency: "LTC", amount: MarketHelper.convertToBigint(3), unit_price: MarketHelper.convertToBigint(0.15), status: "open", created_at: now - 6000}
      ]

      beforeEach (done)->
        GLOBAL.db.BuyOrder.bulkCreate(buyOrdersData).success ()->
          GLOBAL.db.SellOrder.bulkCreate(sellOrdersData).success ()->
            done()

      it "completes the one with the lowest unit price first and with the oldest creation date", (done)->
        OrderBook.matchBuyOrders (err, result)->
          GLOBAL.db.SellOrder.find(2).success (cheaperPriceOrder)->
            GLOBAL.db.SellOrder.find(4).success (higherPriceOrder)->
              cheaperPriceOrder.matched_amount.should.eql 900000000
              higherPriceOrder.matched_amount.should.eql 100000000
              cheaperPriceOrder.status.should.eql "completed"
              higherPriceOrder.status.should.eql "partiallyCompleted"
              done()