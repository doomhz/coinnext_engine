require "./../../helpers/spec_helper"

app = require "./../../../api"
request = require "supertest"

describe "Orders API", ->

  BTC = 1
  LTC = 2

  beforeEach (done)->
    GLOBAL.db.sequelize.sync({force: true}).complete ()->
      done()

  describe "POST /order/:order_id", ()->
    describe "when the order data is complete", ()->
      orderData =
        type: "limit"
        action: "buy"
        buy_currency: LTC
        sell_currency: BTC
        amount: 1000000000
        unit_price: 10000000
      
      it "returns 200 ok and the executed payment ids", (done)->
        request('http://localhost:7000')
        .post("/order/1")
        .send(orderData)
        .expect(200)
        .end done

      it "persists the order data", (done)->
        request('http://localhost:7000')
        .post("/order/1")
        .send(orderData)
        .end (err, res)->
          GLOBAL.db.BuyOrder.findByOrderId 1, (err, order)->
            order.external_order_id.should.eql 1
            order.type.should.eql "limit"
            order.action.should.eql "buy"
            order.buy_currency.should.eql LTC
            order.sell_currency.should.eql BTC
            order.amount.should.eql 1000000000
            order.unit_price.should.eql 10000000
            done()

    describe "when the order data is not complete", ()->
      it "returns 409", (done)->
        request('http://localhost:7000')
        .post("/order/1")
        .send({})
        .expect(409)
        .end done


  describe "DELETE /order/:order_id", ()->
    describe "when there is an open order with the same external id", ()->
      orderData =
        external_order_id: 1
        type: "limit"
        action: "buy"
        buy_currency: LTC
        sell_currency: BTC
        amount: 1000000000
        unit_price: 10000000
        status: "open"

      beforeEach (done)->
        GLOBAL.db.BuyOrder.create(orderData).complete done

      it "returns 200 OK", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(200)
        .end done
      
      it "deletes the order", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(200)
        .end (err, res)->
          GLOBAL.db.BuyOrder.findAll({where: {external_order_id: 1}}).complete (err, orders)->
            orders.length.should.eql 0
            done()


    describe "when the order data is partially completed", ()->
      orderData =
        external_order_id: 1
        type: "limit"
        action: "buy"
        buy_currency: LTC
        sell_currency: BTC
        amount: 1000000000
        unit_price: 10000000
        status: "partiallyCompleted"

      beforeEach (done)->
        GLOBAL.db.BuyOrder.create(orderData).complete done
      
      it "returns 200", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(200)
        .end done

      it "deletes the order", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(200)
        .end (err, res)->
          GLOBAL.db.BuyOrder.findAll({where: {external_order_id: 1}}).complete (err, orders)->
            orders.length.should.eql 0
            done()


    describe "when the order data is complete", ()->
      orderData =
        external_order_id: 1
        type: "limit"
        action: "buy"
        buy_currency: LTC
        sell_currency: BTC
        amount: 1000000000
        unit_price: 10000000
        status: "completed"

      beforeEach (done)->
        GLOBAL.db.BuyOrder.create(orderData).complete done
      
      it "returns 409", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(409)
        .end done


    describe "when the order does not exist", ()->      
      it "returns 409", (done)->
        request('http://localhost:7000')
        .del("/order/1")
        .send()
        .expect(409)
        .end done

