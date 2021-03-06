const async = require('async')

exports.messagesSearch = {
  name: 'messages:search',
  description: 'messages:search',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    searchKeys: { required: true },
    searchValues: { required: true },
    from: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 0 }
    },
    size: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 100 }
    }
  },

  run: function (api, data, next) {
    api.models.Message.findAndCountAll({
      where: api.sequelize.buildCompoundWhere(data, 'messageGuid', 'messageData'),
      order: [['createdAt', 'DESC']],
      limit: data.params.size,
      offset: data.params.from
    }).then((result) => {
      data.response.total = result.count
      data.response.messages = []
      let jobs = []
      data.response.total = result.count
      result.rows.forEach((row) => {
        jobs.push((done) => {
          row.hydrate((error) => {
            data.response.messages.push(row.apiData())
            done(error)
          })
        })
      })

      async.parallel(jobs, next)
    }).catch(next)
  }
}

exports.messagesAggregation = {
  name: 'messages:aggregation',
  description: 'messages:aggregation',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    searchKeys: { required: true },
    searchValues: { required: true },
    aggregation: { required: true, default: 'transport' },
    interval: {
      required: true,
      default: 'DATE'
    },
    start: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 0 }
    },
    end: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return new Date().getTime() }
    }
  },

  run: function (api, data, next) {
    api.models.Message.findAll({
      attributes: [
        [`${data.params.interval}(createdAt)`, data.params.interval],
        data.params.aggregation,
        [api.sequelize.sequelize.fn('count', api.sequelize.sequelize.col('guid')), 'TOTAL']
      ],
      where: api.sequelize.buildCompoundWhere(data, 'messageGuid', 'messageData'),
      limit: data.params.size,
      offset: data.params.from,
      group: [api.sequelize.sequelize.literal(`${data.params.interval}(createdAt)`), data.params.aggregation]
    }).then((results) => {
      data.response.aggregations = {}
      results.forEach((r) => {
        if (!data.response.aggregations[r.dataValues[data.params.interval]]) {
          let d = {}
          d[r[data.params.aggregation]] = r.dataValues.TOTAL
          data.response.aggregations[r.dataValues[data.params.interval]] = d
        } else {
          data.response.aggregations[r.dataValues[data.params.interval]][r[data.params.aggregation]] = r.dataValues.TOTAL
        }
      })
      next()
    }).catch(next)
  }
}
