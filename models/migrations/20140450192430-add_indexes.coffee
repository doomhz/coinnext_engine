module.exports =
  up: (migration, DataTypes, done) ->
    migration.addIndex "events", ["status"]
    migration.addIndex "events", ["created_at"]

    migration.addIndex "orders", ["status"]
    migration.addIndex "orders", ["action"]
    migration.addIndex "orders", ["buy_currency"]
    migration.addIndex "orders", ["sell_currency"]
    migration.addIndex "orders", ["unit_price"]
    migration.addIndex "orders", ["created_at"]

    done()
    return

  down: (migration, DataTypes, done) ->
    migration.removeIndex "events", ["status"]
    migration.removeIndex "events", ["created_at"]

    migration.removeIndex "orders", ["status"]
    migration.removeIndex "orders", ["action"]
    migration.removeIndex "orders", ["buy_currency"]
    migration.removeIndex "orders", ["sell_currency"]
    migration.removeIndex "orders", ["unit_price"]
    migration.removeIndex "orders", ["created_at"]

    done()
    return