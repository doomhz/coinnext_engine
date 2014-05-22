fs = require "fs"
environment = process.env.NODE_ENV or 'development'
config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', 'utf8'))[environment]
GLOBAL.appConfig = ()-> config
GLOBAL.db = require './models/index'
GLOBAL.queue = require './lib/queue/index'

task "db:create_tables", "Create all tables", ()->
  GLOBAL.db.sequelize.sync().complete ()->

task "db:create_tables_force", "Drop and create all tables", ()->
  return console.log "Not in production!"  if environment is "production"
  GLOBAL.db.sequelize.query("DROP TABLE SequelizeMeta").complete ()->
    GLOBAL.db.sequelize.sync({force: true}).complete ()->

task "db:migrate", "Run pending database migrations", ()->
  migrator = GLOBAL.db.sequelize.getMigrator
    path:        "#{process.cwd()}/models/migrations"
    filesFilter: /\.coffee$/
    coffee: true
  migrator.migrate().success ()->
    console.log "Database migrations finished."

task "db:migrate_undo", "Undo database migrations", ()->
  migrator = GLOBAL.db.sequelize.getMigrator
    path:        "#{process.cwd()}/models/migrations"
    filesFilter: /\.coffee$/
    coffee: true
  migrator.migrate({method: "down"}).success ()->
    console.log "Database migrations reverted."

task "db:create_queue", "Create all queue tables", ()->
  GLOBAL.queue.sequelize.sync().complete ()->

task "db:create_queue_force", "Drop and create all queue tables", ()->
  return console.log "Not in production!"  if environment is "production"
  GLOBAL.queue.sequelize.query("DROP TABLE SequelizeMeta").complete ()->
    GLOBAL.queue.sequelize.sync({force: true}).complete ()->

task "db:migrate_queue", "Run pending queue migrations", ()->
  migrator = GLOBAL.queue.sequelize.getMigrator
    path:        "#{process.cwd()}/lib/queue/migrations"
    filesFilter: /\.coffee$/
    coffee: true
  migrator.migrate().success ()->
    console.log "Queue migrations finished."

task "db:migrate_queue_undo", "Undo queue migrations", ()->
  migrator = GLOBAL.queue.sequelize.getMigrator
    path:        "#{process.cwd()}/lib/queue/migrations"
    filesFilter: /\.coffee$/
    coffee: true
  migrator.migrate({method: "down"}).success ()->
    console.log "Queue migrations reverted."
