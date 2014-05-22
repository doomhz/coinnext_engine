module.exports =
  up: (migration, DataTypes, done) ->
    migration.addIndex "buy_orders", ["status"]
    migration.addIndex "buy_orders", ["buy_currency"]
    migration.addIndex "buy_orders", ["sell_currency"]
    migration.addIndex "buy_orders", ["unit_price"]
    migration.addIndex "buy_orders", ["created_at"]

    migration.addIndex "sell_orders", ["status"]
    migration.addIndex "sell_orders", ["buy_currency"]
    migration.addIndex "sell_orders", ["sell_currency"]
    migration.addIndex "sell_orders", ["unit_price"]
    migration.addIndex "sell_orders", ["created_at"]

    done()
    return

  down: (migration, DataTypes, done) ->
    migration.removeIndex "buy_orders", ["status"]
    migration.removeIndex "buy_orders", ["buy_currency"]
    migration.removeIndex "buy_orders", ["sell_currency"]
    migration.removeIndex "buy_orders", ["unit_price"]
    migration.removeIndex "buy_orders", ["created_at"]

    migration.removeIndex "sell_orders", ["status"]
    migration.removeIndex "sell_orders", ["buy_currency"]
    migration.removeIndex "sell_orders", ["sell_currency"]
    migration.removeIndex "sell_orders", ["unit_price"]
    migration.removeIndex "sell_orders", ["created_at"]

    done()
    return